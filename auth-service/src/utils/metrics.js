const client = require('prom-client');
const logger = require('./logger');

/**
 * Prometheus metrics configuration for Auth Service
 */

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register, prefix: 'auth_' });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'auth_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const authOperationsTotal = new client.Counter({
  name: 'auth_operations_total',
  help: 'Total number of auth operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

const activeUsers = new client.Gauge({
  name: 'auth_active_users',
  help: 'Number of currently active users',
  registers: [register],
});

const tokenOperations = new client.Counter({
  name: 'auth_token_operations_total',
  help: 'Total number of token operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

const dbQueryDuration = new client.Histogram({
  name: 'auth_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

const redisOperations = new client.Counter({
  name: 'auth_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

/**
 * Middleware to collect HTTP metrics
 */
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const route = req.route?.path || req.path;
  const method = req.method;

  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode;

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  });

  next();
};

/**
 * Record auth operation metrics
 * @param {string} operation - Operation type (register, login, logout, refresh, verify)
 * @param {string} status - Status (success, failure)
 */
function recordAuthOperation(operation, status) {
  authOperationsTotal.inc({ operation, status });
}

/**
 * Record token operation metrics
 * @param {string} operation - Operation type (generate, verify, refresh, revoke)
 * @param {string} status - Status (success, failure)
 */
function recordTokenOperation(operation, status) {
  tokenOperations.inc({ operation, status });
}

/**
 * Record database query duration
 * @param {string} queryType - Type of query (select, insert, update, delete)
 * @param {number} durationMs - Duration in milliseconds
 */
function recordDbQuery(queryType, durationMs) {
  dbQueryDuration.observe({ query_type: queryType }, durationMs / 1000);
}

/**
 * Record Redis operation
 * @param {string} operation - Operation type (get, set, del, exists)
 * @param {string} status - Status (success, failure)
 */
function recordRedisOperation(operation, status) {
  redisOperations.inc({ operation, status });
}

/**
 * Set active users count
 * @param {number} count - Number of active users
 */
function setActiveUsers(count) {
  activeUsers.set(count);
}

/**
 * Get metrics endpoint handler
 */
async function metricsHandler(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (err) {
    logger.error('Error generating metrics', { error: err.message });
    res.status(500).send('Error generating metrics');
  }
}

/**
 * Get metrics as JSON (for debugging)
 */
async function metricsJsonHandler(req, res) {
  try {
    const metrics = await register.getMetricsAsJSON();
    res.json(metrics);
  } catch (err) {
    logger.error('Error generating metrics JSON', { error: err.message });
    res.status(500).json({ error: 'Error generating metrics' });
  }
}

module.exports = {
  register,
  metricsMiddleware,
  metricsHandler,
  metricsJsonHandler,
  recordAuthOperation,
  recordTokenOperation,
  recordDbQuery,
  recordRedisOperation,
  setActiveUsers,
  // Expose individual metrics for direct use if needed
  httpRequestsTotal,
  httpRequestDuration,
  authOperationsTotal,
  activeUsers,
  tokenOperations,
  dbQueryDuration,
  redisOperations,
};