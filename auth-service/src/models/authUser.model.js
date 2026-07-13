const { pool } = require('../config/db');
const logger = require('../utils/logger');

const AuthUserModel = {
  /**
   * Create a new user
   */
  create: async ({ userId, email, username, passwordHash }) => {
    const { rows } = await pool.query(
      `INSERT INTO auth_users (user_id, email, username, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, email, username, created_at`,
      [userId, email, username, passwordHash]
    );
    return rows[0] || null;
  },

  /**
   * Find user by email
   */
  findByEmail: async (email) => {
    const { rows } = await pool.query(
      'SELECT * FROM auth_users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Find user by userId
   */
  findByUserId: async (userId) => {
    const { rows } = await pool.query(
      'SELECT * FROM auth_users WHERE user_id = $1',
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * Find user by username
   */
  findByUsername: async (username) => {
    const { rows } = await pool.query(
      'SELECT * FROM auth_users WHERE username = $1',
      [username]
    );
    return rows[0] || null;
  },

  /**
   * Check if email exists
   */
  exists: async (email) => {
    const { rows } = await pool.query(
      'SELECT 1 FROM auth_users WHERE email = $1',
      [email]
    );
    return rows.length > 0;
  },

  /**
   * Check if username exists
   */
  usernameExists: async (username) => {
    const { rows } = await pool.query(
      'SELECT 1 FROM auth_users WHERE username = $1',
      [username]
    );
    return rows.length > 0;
  },
};

module.exports = AuthUserModel;