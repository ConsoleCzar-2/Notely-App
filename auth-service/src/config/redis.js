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

module.exports = { getRedisClient };
