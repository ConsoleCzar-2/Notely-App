const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { signAccessToken, signRefreshToken, verifyToken, decodeToken } = require('../utils/jwt');
const AuthUserModel = require('../models/authUser.model');
const { getRedisClient, storeRefreshToken, getRefreshToken, deleteRefreshToken, validateRefreshToken } = require('../config/redis');
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

    if (await AuthUserModel.exists(email)) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    if (await AuthUserModel.usernameExists(username)) {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
    const userId = uuidv4();

    const user = await AuthUserModel.create({ userId, email, username, passwordHash });

    const accessToken = signAccessToken({ userId: user.user_id, email: user.email, username: user.username });
    const refreshToken = signRefreshToken({ userId: user.user_id, email: user.email, username: user.username });

    // Store refresh token in Redis
    const refreshTtl = 7 * 24 * 60 * 60; // 7 days in seconds
    await storeRefreshToken(user.user_id, refreshToken, refreshTtl);

    logger.info(`User registered: ${email}`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        accessToken,
        refreshToken,
        user: { userId: user.user_id, email: user.email, username: user.username },
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

    const user = await AuthUserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = signAccessToken({ userId: user.user_id, email: user.email, username: user.username });
    const refreshToken = signRefreshToken({ userId: user.user_id, email: user.email, username: user.username });

    // Store refresh token in Redis
    const refreshTtl = 7 * 24 * 60 * 60; // 7 days in seconds
    await storeRefreshToken(user.user_id, refreshToken, refreshTtl);

    logger.info(`User logged in: ${email}`);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: { userId: user.user_id, email: user.email, username: user.username },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/refresh
 * Body: { refreshToken }
 * Rotates refresh token - invalidates old one and issues new pair
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken is required' });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Refresh token expired' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
      }
      throw err;
    }

    const userId = decoded.userId;

    // Validate against stored refresh token (rotation check)
    const isValid = await validateRefreshToken(userId, refreshToken);
    if (!isValid) {
      // Token reuse detected - potential theft, invalidate all tokens for user
      await deleteRefreshToken(userId);
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    // Get user details
    const user = await AuthUserModel.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Generate new token pair (rotation)
    const newAccessToken = signAccessToken({ userId: user.user_id, email: user.email, username: user.username });
    const newRefreshToken = signRefreshToken({ userId: user.user_id, email: user.email, username: user.username });

    // Store new refresh token (invalidates old one)
    const refreshTtl = 7 * 24 * 60 * 60; // 7 days in seconds
    await storeRefreshToken(user.user_id, newRefreshToken, refreshTtl);

    logger.info(`Token refreshed for user: ${user.email}`);

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: { userId: user.user_id, email: user.email, username: user.username },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/logout
 * Header: Authorization: Bearer <token>
 * Body: { refreshToken } (optional - to also invalidate refresh token)
 */
const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const accessToken = authHeader.split(' ')[1];
    const { refreshToken } = req.body;

    // Blacklist access token
    await blacklistToken(accessToken);

    // If refresh token provided, also delete it from Redis
    if (refreshToken) {
      try {
        const decoded = verifyToken(refreshToken);
        if (decoded && decoded.userId) {
          await deleteRefreshToken(decoded.userId);
        }
      } catch (err) {
        // Ignore invalid refresh token on logout
        logger.warn(`Invalid refresh token on logout: ${err.message}`);
      }
    }

    logger.info(`User logged out, tokens invalidated`);

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

module.exports = { register, login, refresh, logout, verify };
