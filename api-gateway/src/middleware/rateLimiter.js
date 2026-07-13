const rateLimit = require('express-rate-limit');
const config = require('../config');

const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

/**
 * Per-user rate limiter
 * Uses x-user-id header (set by authenticate middleware) to limit requests per user
 */
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window per user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID from authenticated request, fallback to IP
    return req.headers['x-user-id'] || req.ip;
  },
  message: { success: false, message: 'Too many requests from this user, please try again later.' },
  skip: (req) => {
    // Skip if no user ID (unauthenticated requests handled by globalLimiter)
    return !req.headers['x-user-id'];
  },
});

module.exports = { globalLimiter, authLimiter, userLimiter };
