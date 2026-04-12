const { pool } = require('../config/db');

const UserModel = {
  /**
   * Create a user profile row (called after auth registration)
   */
  create: async ({ userId, email, username }) => {
    const { rows } = await pool.query(
      `INSERT INTO users (user_id, email, username)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId, email, username]
    );
    return rows[0] || null;
  },

  /**
   * Find user by their JWT userId
   */
  findByUserId: async (userId) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    return rows[0] || null;
  },

  /**
   * Create or update a user profile row.
   */
  upsert: async (userId, { email, username, fullName, bio, avatarUrl }) => {
    const { rows } = await pool.query(
      `INSERT INTO users (user_id, email, username, full_name, bio, avatar_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
       SET email       = EXCLUDED.email,
           username    = EXCLUDED.username,
           full_name   = COALESCE(EXCLUDED.full_name, users.full_name),
           bio         = COALESCE(EXCLUDED.bio, users.bio),
           avatar_url  = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
           updated_at  = NOW()
       RETURNING *`,
      [userId, email, username, fullName || null, bio || null, avatarUrl || null]
    );
    return rows[0] || null;
  },

  /**
   * Delete user account
   */
  delete: async (userId) => {
    const { rowCount } = await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);
    return rowCount > 0;
  },
};

module.exports = UserModel;
