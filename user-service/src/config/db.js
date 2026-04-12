const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/userdb',
});

pool.on('connect', () => logger.info('PostgreSQL connected'));
pool.on('error', (err) => logger.error('PostgreSQL error:', err.message));

/**
 * Initialize the users table if it doesn't exist
 */
const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(255) UNIQUE NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        username    VARCHAR(100) NOT NULL,
        full_name   VARCHAR(255),
        bio         TEXT,
        avatar_url  TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE users
      ALTER COLUMN avatar_url TYPE TEXT
    `);

    logger.info('Users table initialized');
  } catch (err) {
    logger.error('DB init error:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
