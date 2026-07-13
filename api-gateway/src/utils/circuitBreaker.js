const CircuitBreaker = require('opossum');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Circuit Breaker configuration
 */
const circuitBreakerOptions = {
  timeout: 5000, // If request takes longer than 5s, consider it a failure
  errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
  resetTimeout: 30000, // Try again after 30 seconds
  rollingCountTimeout: 10000, // 10 second rolling window
  rollingCountBuckets: 10, // 10 buckets for rolling window
  name: 'service-circuit-breaker',
};

/**
 * Create a circuit breaker for a specific service
 * @param {string} serviceName - Name of the service (auth, user, notes)
 * @param {Function} requestFn - Function that makes the actual request
 * @returns {CircuitBreaker} - Configured circuit breaker instance
 */
function createServiceCircuitBreaker(serviceName, requestFn) {
  const breaker = new CircuitBreaker(requestFn, circuitBreakerOptions);

  // Event handlers for monitoring
  breaker.on('open', () => {
    logger.warn(`Circuit breaker OPENED for ${serviceName} service`);
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED for ${serviceName} service`);
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker HALF-OPEN for ${serviceName} service`);
  });

  breaker.on('fallback', (err) => {
    logger.error(`Circuit breaker FALLBACK triggered for ${serviceName}:`, err.message);
  });

  breaker.on('failure', (err) => {
    logger.warn(`Circuit breaker failure for ${serviceName}:`, err.message);
  });

  breaker.on('success', () => {
    // Success - circuit breaker working normally
  });

  breaker.on('timeout', () => {
    logger.warn(`Circuit breaker TIMEOUT for ${serviceName} service`);
  });

  breaker.on('reject', () => {
    logger.warn(`Circuit breaker REJECTED request for ${serviceName} service`);
  });

  return breaker;
}

/**
 * Fallback function for when circuit breaker is open
 * @param {string} serviceName - Name of the service
 * @returns {Function} - Fallback function
 */
function createFallback(serviceName) {
  return async (req, res) => {
    const requestId = req.requestId || req.headers['x-request-id'];
    logger.error(`Circuit breaker fallback for ${serviceName}`, {
      requestId,
      service: serviceName,
      path: req.path,
      method: req.method,
    });

    return res.status(503).json({
      success: false,
      message: `${serviceName} service is temporarily unavailable. Please try again later.`,
      error: 'SERVICE_UNAVAILABLE',
      requestId,
    });
  };
}

module.exports = {
  createServiceCircuitBreaker,
  createFallback,
  circuitBreakerOptions,
};