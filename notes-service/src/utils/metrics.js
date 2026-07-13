const client = require('prom-client');
const logger = require('./logger');

/**
 * Prometheus metrics configuration for Notes Service
 */

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register, prefix: 'notes_' });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'notes_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'notes_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const notesOperationsTotal = new client.Counter({
  name: 'notes_operations_total',
  help: 'Total number of notes operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

const activeNotes = new client.Gauge({
  name: 'notes_active_notes',
  help: 'Number of active (non-archived) notes',
  registers: [register],
});

const dbQueryDuration = new client.Histogram({
  name: 'notes_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

const searchOperations = new client.Counter({
  name: 'notes_search_operations_total',
  help: 'Total number of search operations',
  labelNames: ['status'],
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
 * Record notes operation metrics
 * @param {string} operation - Operation type (create, get, update, delete, archive, pin, search)
 * @param {string} status - Status (success, failure)
 */
function recordNotesOperation(operation, status) {
  notesOperationsTotal.inc({ operation, status });
}

/**
 * Record database query duration
 * @param {string} queryType - Type of query (find, findOne, create, update, delete, aggregate)
 * @param {number} durationMs - Duration in milliseconds
 */
function recordDbQuery(queryType, durationMs) {
  dbQueryDuration.observe({ query_type: queryType }, durationMs / 1000);
}

/**
 * Set active notes count
 * @param {number} count - Number of active notes
 */
function setActiveNotes(count) {
  activeNotes.set(count);
}

/**
 * Record search operation
 * @param {string} status - Status (success, failure)
 */
function recordSearchOperation(status) {
  searchOperations.inc({ status });
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
  recordNotesOperation,
  recordDbQuery,
  setActiveNotes,
  recordSearchOperation,
  // Expose individual metrics for direct use if needed
  httpRequestsTotal,
  httpRequestDuration,
  notesOperationsTotal,
  activeNotes,
  dbQueryDuration,
  searchOperations,
};