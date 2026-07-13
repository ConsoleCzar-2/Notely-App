const fetch = require('node-fetch');
const logger = require('../utils/logger');
const { createServiceCircuitBreaker, createFallback } = require('../utils/circuitBreaker');

/**
 * Retry wrapper for fetch requests with exponential backoff
 * @param {string} url - Target URL
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries (default: 2)
 * @returns {Promise<Response>}
 */
const fetchWithRetry = async (url, options, maxRetries = 2) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { timeout: 5000, ...options });
      
      // If response is ok or it's a client error (4xx), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // For 5xx errors, retry (these are server errors and might be transient)
      if (response.status >= 500 && attempt < maxRetries) {
        lastError = new Error(`Server error ${response.status}`);
        const backoffMs = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }
      
      return response;
    } catch (err) {
      lastError = err;
      
      // Don't retry on timeout for the last attempt
      if (attempt < maxRetries) {
        logger.warn(`Request attempt ${attempt + 1} failed, retrying in ${Math.min(100 * Math.pow(2, attempt), 1000)}ms: ${err.message}`);
        const backoffMs = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }
  
  throw lastError;
};

/**
 * Circuit breakers for each service
 */
const circuitBreakers = {};

/**
 * Get or create a circuit breaker for a service
 * @param {string} serviceName - Service name (auth, user, notes)
 * @param {string} targetUrl - Target URL for the service
 * @returns {CircuitBreaker} - Circuit breaker instance
 */
function getCircuitBreaker(serviceName, targetUrl) {
  if (!circuitBreakers[serviceName]) {
    const requestFn = async (options) => {
      const response = await fetchWithRetry(targetUrl, options);
      const data = await response.json();
      return { status: response.status, data };
    };
    
    circuitBreakers[serviceName] = createServiceCircuitBreaker(serviceName, requestFn);
  }
  
  return circuitBreakers[serviceName];
}

/**
 * Extract service name from target URL
 * @param {string} targetUrl - Full target URL
 * @returns {string} - Service name
 */
function getServiceName(targetUrl) {
  if (targetUrl.includes('/auth/')) return 'auth';
  if (targetUrl.includes('/users/')) return 'user';
  if (targetUrl.includes('/notes/')) return 'notes';
  return 'unknown';
}

/**
 * Forward an incoming Express request to a downstream service URL.
 * Copies method, headers (minus host), and body.
 * Streams the response status + JSON back to the client.
 * Includes retry logic for transient failures and circuit breaker for fault tolerance.
 *
 * @param {string} targetUrl - Full URL of the downstream endpoint
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const proxyRequest = async (targetUrl, req, res, next) => {
  try {
    // Build headers — forward everything except host
    const headers = {};
    for (const [key, val] of Object.entries(req.headers)) {
      if (key !== 'host') headers[key] = val;
    }

    const options = {
      method: req.method,
      headers,
    };

    // Attach body for mutating methods
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      options.body = JSON.stringify(req.body);
      headers['content-type'] = 'application/json';
    }

    const serviceName = getServiceName(targetUrl);
    const breaker = getCircuitBreaker(serviceName, targetUrl);
    const fallback = createFallback(serviceName);

    logger.info(`Proxying ${req.method} ${req.path} → ${targetUrl} (service: ${serviceName})`);

    // Execute request through circuit breaker
    const result = await breaker.fire(options).catch(fallback);
    
    // If fallback was triggered, it already sent the response
    if (res.headersSent) {
      return;
    }

    // Forward status and JSON body back to client
    return res.status(result.status).json(result.data);
  } catch (err) {
    logger.error(`Proxy error to ${targetUrl}: ${err.message}`);
    return res.status(503).json({
      success: false,
      message: 'Downstream service unavailable',
    });
  }
};

module.exports = { proxyRequest };
