const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Authenticate middleware used on protected gateway routes.
 *
 * Verifies JWT locally using shared secret (no network call to auth-service).
 * On success, injects x-user-* headers so downstream services
 * can read user identity without re-verifying the JWT.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify JWT locally using shared secret
    const decoded = jwt.verify(token, config.jwt.secret);

    // Inject user identity as headers for downstream services
    req.headers['x-user-id'] = decoded.userId;
    req.headers['x-user-email'] = decoded.email;
    req.headers['x-user-username'] = decoded.username;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    logger.error(`JWT verification error: ${err.message}`);
    return res.status(500).json({ success: false, message: 'Authentication error' });
  }
};

module.exports = { authenticate };
