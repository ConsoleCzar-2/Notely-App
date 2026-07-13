const winston = require('winston');

/**
 * Custom format to include correlation ID (request ID) in logs
 */
const correlationIdFormat = winston.format((info) => {
  // Try to get correlation ID from various sources
  const correlationId = info.correlationId || info.requestId || info['x-request-id'];
  if (correlationId) {
    info.correlationId = correlationId;
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    correlationIdFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'api-gateway' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
          const corrId = correlationId ? ` [${correlationId}]` : '';
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] [${service}]${corrId} ${level}: ${message}${metaStr}`;
        })
      ),
    }),
  ],
});

module.exports = logger;
