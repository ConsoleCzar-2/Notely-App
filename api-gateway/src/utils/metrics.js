const client = require('prom-client');
const logger = require('./logger');

/**
 * Prometheus metrics configuration for API Gateway
 */

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register, prefix: 'gateway_' });

// Custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'gateway_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'gateway_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestSize = new client.Histogram({
  name: 'gateway_http_request_size_bytes',
  help: 'Size of HTTP request bodies in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

const httpResponseSize = new client.Histogram({
  name: 'gateway_http_response_size_bytes',
  help: 'Size of HTTP response bodies in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'gateway_active_connections',
  help: 'Number of active connections',
  registers: [register],
});

const upstreamRequestsTotal = new client.Counter({
  name: 'gateway_upstream_requests_total',
  help: 'Total number of upstream requests',
  labelNames: ['service', 'method', 'status_code'],
  registers: [register],
});

const upstreamRequestDuration = new client.Histogram({
  name: 'gateway_upstream_request_duration_seconds',
  help: 'Duration of upstream requests in seconds',
  labelNames: ['service', 'method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

const circuitBreakerState = new client.Gauge({
  name: 'gateway_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
  labelNames: ['service'],
  registers: [register],
});

const rateLimitExceeded = new client.Counter({
  name: 'gateway_rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['limiter_type'],
  registers: [register],
});

const authFailures = new client.Counter({
  name: 'gateway_auth_failures_total',
  help: 'Total number of authentication failures',
  labelNames: ['reason'],
  registers: [register],
});

/**
 * Middleware to collect HTTP metrics
 */
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const route = req.route?.path || req.path;
  const method = req.method;

  // Track request size
  const requestSize = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;
  if (requestSize > 0) {
    httpRequestSize.observe({ method, route }, requestSize);
  }

  // Track active connections
  activeConnections.inc();

  // Hook into response finish to collect metrics
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode;

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

    const responseSize = res.getHeader('content-length') ? parseInt(res.getHeader('content-length'), 10) : 0;
    if (responseSize > 0) {
      httpResponseSize.observe({ method, route }, responseSize);
    }

    activeConnections.dec();
  });

  next();
};

/**
 * Record upstream request metrics
 * @param {string} service - Service name (auth, user, notes)
 * @param {string} method - HTTP method
 * @param {number} statusCode - HTTP status code
 * @param {number} durationMs - Duration in milliseconds
 */
function recordUpstreamRequest(service, method, statusCode, durationMs) {
  upstreamRequestsTotal.inc({ service, method, status_code: statusCode });
  upstreamRequestDuration.observe({ service, method }, durationMs / 1000);
}

/**
 * Record circuit breaker state change
 * @param {string} service - Service name
 * @param {string} state - Circuit breaker state (closed, half-open, open)
 */
function recordCircuitBreakerState(service, state) {
  const stateMap = { closed: 0, 'half-open': 1, open: 2 };
  circuitBreakerState.set({ service }, stateMap[state] || 0);
}

/**
 * Record rate limit exceeded
 * @param {string} limiterType - Type of limiter (global, auth, user)
 */
function recordRateLimitExceeded(limiterType) {
  rateLimitExceeded.inc({ limiter_type: limiterType });
}

/**
 * Record authentication failure
 * @param {string} reason - Reason for failure (invalid_token, expired_token, missing_token, etc.)
 */
function recordAuthFailure(reason) {
  authFailures.inc({ reason });
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
  recordUpstreamRequest,
  recordCircuitBreakerState,
  recordRateLimitExceeded,
  recordAuthFailure,
  // Expose individual metrics for direct use if needed
  httpRequestsTotal,
  httpRequestDuration,
  httpRequestSize,
  httpResponseSize,
  activeConnections,
  upstreamRequestsTotal,
  upstreamRequestDuration,
  circuitBreakerState,
  rateLimitExceeded,
  authFailures,
};