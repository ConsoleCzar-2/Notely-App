const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Request ID middleware for distributed tracing
 * Generates a unique request ID for each incoming request
 * and adds it to response headers and request object for logging
 */
const requestIdMiddleware = (req, res, next) => {
  // Check for existing request ID from upstream (e.g., API Gateway)
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to request object for use in controllers/services
  req.requestId = requestId;
  
  // Add to response headers for client-side tracing
  res.setHeader('X-Request-ID', requestId);
  
  // Add to response locals for template access if needed
  res.locals.requestId = requestId;
  
  // Create a child logger with the correlation ID for this request
  req.log = logger.child({ correlationId: requestId });
  
  next();
};

module.exports = { requestIdMiddleware };