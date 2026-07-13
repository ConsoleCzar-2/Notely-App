/**
 * Migration - Create users table
 * Run with: npm run migrate up
 */

exports.up = async (pgm) => {
  // Create users table
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    username: {
      type: 'varchar(100)',
      notNull: true,
    },
    full_name: {
      type: 'varchar(255)',
    },
    bio: {
      type: 'text',
    },
    avatar_url: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Create indexes
  pgm.createIndex('users', 'user_id', { name: 'idx_users_user_id', unique: true });
  pgm.createIndex('users', 'email', { name: 'idx_users_email', unique: true });
  pgm.createIndex('users', 'username', { name: 'idx_users_username' });
};

exports.down = async (pgm) => {
  pgm.dropTable('users');
};