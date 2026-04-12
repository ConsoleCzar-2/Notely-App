const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { signToken, verifyToken, decodeToken } = require('../utils/jwt');
const UserStore = require('../models/userStore');
const { getRedisClient } = require('../config/redis');
const config = require('../config');
const logger = require('../utils/logger');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BLACKLIST_PREFIX = 'blacklist:';

const blacklistToken = async (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return;
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    try {
      const redis = getRedisClient();
      await redis.set(`${BLACKLIST_PREFIX}${token}`, '1', 'EX', ttl);
    } catch (err) {
      logger.warn(`Redis unavailable, token not blacklisted: ${err.message}`);
    }
  }
};

const isBlacklisted = async (token) => {
  try {
    const redis = getRedisClient();
    const result = await redis.get(`${BLACKLIST_PREFIX}${token}`);
    return result !== null;
  } catch (err) {
    // If Redis is down, log a warning and allow the request (fail open).
    // In production you may choose to fail closed depending on security policy.
    logger.warn(`Redis unavailable, skipping blacklist check: ${err.message}`);
    return false;
  }
};

// ─── Controller Methods ───────────────────────────────────────────────────────

/**
 * POST /auth/register
 * Body: { email, username, password }
 */
const register = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ success: false, message: 'email, username and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    if (UserStore.exists(email)) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
    const userId = uuidv4();

    const user = UserStore.create({ userId, email, username, passwordHash });

    const token = signToken({ userId: user.userId, email: user.email, username: user.username });

    logger.info(`User registered: ${email}`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: { userId: user.userId, email: user.email, username: user.username },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const user = UserStore.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken({ userId: user.userId, email: user.email, username: user.username });

    logger.info(`User logged in: ${email}`);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { userId: user.userId, email: user.email, username: user.username },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/logout
 * Header: Authorization: Bearer <token>
 */
const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    await blacklistToken(token);

    logger.info(`User logged out, token blacklisted`);

    return res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /auth/verify
 * Used by API Gateway to verify tokens on protected routes
 * Header: Authorization: Bearer <token>
 */
const verify = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Check blacklist
    const blacklisted = await isBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ success: false, message: 'Token has been invalidated' });
    }

    const decoded = verifyToken(token);

    return res.json({
      success: true,
      data: { userId: decoded.userId, email: decoded.email, username: decoded.username },
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    next(err);
  }
};

module.exports = { register, login, logout, verify };
