const fetch = require('node-fetch');
const logger = require('./logger');

/**
 * Check health of a single service by making a GET request to its /health endpoint
 * @param {string} name - Service name
 * @param {string} url - Service URL
 * @returns {Promise<{name: string, status: string, url?: string}>}
 */
const checkService = async (name, url) => {
  try {
    const response = await fetch(`${url}/health`, { timeout: 3000 });
    const body = await response.json();
    return {
      name,
      status: body.status || 'healthy',
      url,
    };
  } catch (error) {
    logger.error(`Health check failed for ${name} at ${url}: ${error.message}`);
    return {
      name,
      status: 'unreachable',
      url,
    };
  }
};

/**
 * Get comprehensive health status including all downstream services and gateway info
 * @param {Object} config - Configuration object with service URLs
 * @returns {Promise<{gateway: string, frontend: string, microservices: Array, allHealthy: boolean}>}
 */
const getFullHealthStatus = async (config) => {
  // Check downstream microservices
  const microserviceResults = await Promise.all([
    checkService('auth', config.services.auth),
    checkService('user', config.services.user),
    checkService('notes', config.services.notes),
  ]);

  const allHealthy = microserviceResults.every(r => r.status === 'healthy');

  return {
    gateway: 'healthy',
    frontend: 'localhost:8080',
    services: microserviceResults,
    allHealthy,
  };
};

/**
 * Get minimal health status with just service statuses (for faster responses)
 * @param {Object} config - Configuration object with service URLs
 * @returns {Promise<{gateway: string, services: Array, allHealthy: boolean}>}
 */
const getMinimalHealthStatus = async (config) => {
  const microserviceResults = await Promise.all([
    checkService('auth', config.services.auth),
    checkService('user', config.services.user),
    checkService('notes', config.services.notes),
  ]);

  const allHealthy = microserviceResults.every(r => r.status === 'healthy');

  return {
    gateway: 'healthy',
    services: microserviceResults,
    allHealthy,
  };
};

module.exports = {
  checkService,
  getFullHealthStatus,
  getMinimalHealthStatus,
};
