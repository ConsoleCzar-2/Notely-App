const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

let client = null;

const getRedisClient = () => {
  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    client.on('connect', () => logger.info('Redis connected'));
    client.on('error', (err) => logger.error('Redis error:', err.message));
  }
  return client;
};

/**
 * Store refresh token for a user with rotation support
 * @param {string} userId - User ID
 * @param {string} refreshToken - Refresh token to store
 * @param {number} ttlSeconds - TTL in seconds
 */
const storeRefreshToken = async (userId, refreshToken, ttlSeconds) => {
  const redis = getRedisClient();
  const key = `refresh_token:${userId}`;
  await redis.set(key, refreshToken, 'EX', ttlSeconds);
};

/**
 * Get stored refresh token for a user
 * @param {string} userId - User ID
 * @returns {string|null} Stored refresh token or null
 */
const getRefreshToken = async (userId) => {
  const redis = getRedisClient();
  const key = `refresh_token:${userId}`;
  return await redis.get(key);
};

/**
 * Delete refresh token for a user (logout)
 * @param {string} userId - User ID
 */
const deleteRefreshToken = async (userId) => {
  const redis = getRedisClient();
  const key = `refresh_token:${userId}`;
  await redis.del(key);
};

/**
 * Check if refresh token matches stored token (for rotation validation)
 * @param {string} userId - User ID
 * @param {string} refreshToken - Refresh token to validate
 * @returns {boolean} True if matches
 */
const validateRefreshToken = async (userId, refreshToken) => {
  const stored = await getRefreshToken(userId);
  return stored === refreshToken;
};

module.exports = { getRedisClient, storeRefreshToken, getRefreshToken, deleteRefreshToken, validateRefreshToken };
