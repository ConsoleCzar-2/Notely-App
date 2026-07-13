const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/userdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => logger.info('Auth Service PostgreSQL connected'));
pool.on('error', (err) => logger.error('Auth Service PostgreSQL error:', err.message));

/**
 * Initialize the database by running migrations
 */
const initDB = async () => {
  try {
    // Test connection
    const client = await pool.connect();
    client.release();
    logger.info('Auth Service database connection verified');
    
    // Note: Migrations should be run separately using 'npm run migrate up'
    // This function just verifies the connection
    logger.info('Auth Service database initialized (run migrations separately with: npm run migrate up)');
  } catch (err) {
    logger.error('Auth DB init error: ' + err.message);
    throw err;
  }
};

module.exports = { pool, initDB };