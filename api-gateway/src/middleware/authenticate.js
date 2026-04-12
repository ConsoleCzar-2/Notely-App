const fetch = require('node-fetch');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Authenticate middleware used on protected gateway routes.
 *
 * Forwards the Bearer token to auth-service /auth/verify.
 * On success, injects x-user-* headers so downstream services
 * can read user identity without re-verifying the JWT.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const response = await fetch(`${config.services.auth}/auth/verify`, {
      method: 'GET',
      headers: { authorization: authHeader },
    });

    const body = await response.json();

    if (!response.ok || !body.success) {
      return res.status(401).json({ success: false, message: body.message || 'Unauthorized' });
    }

    // Inject user identity as headers for downstream services
    req.headers['x-user-id']       = body.data.userId;
    req.headers['x-user-email']    = body.data.email;
    req.headers['x-user-username'] = body.data.username;

    next();
  } catch (err) {
    logger.error(`Auth service unreachable: ${err.message}`);
    return res.status(503).json({ success: false, message: 'Authentication service unavailable' });
  }
};

module.exports = { authenticate };
