const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(`Gateway error: ${err.message}`, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal gateway error' : err.message,
  });
};

module.exports = { errorHandler };
