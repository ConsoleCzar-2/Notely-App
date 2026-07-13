/**
 * Migration - Create refresh_tokens table
 * Run with: npm run migrate up
 */

exports.up = async (pgm) => {
  // Create refresh_tokens table
  pgm.createTable('refresh_tokens', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'auth_users(id)',
      onDelete: 'CASCADE',
    },
    token_hash: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    expires_at: {
      type: 'timestamptz',
      notNull: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    revoked_at: {
      type: 'timestamptz',
    },
    replaced_by_token_hash: {
      type: 'varchar(255)',
    },
    user_agent: {
      type: 'text',
    },
    ip_address: {
      type: 'inet',
    },
  });

  // Create indexes
  pgm.createIndex('refresh_tokens', 'user_id', { name: 'idx_refresh_tokens_user_id' });
  pgm.createIndex('refresh_tokens', 'token_hash', { name: 'idx_refresh_tokens_token_hash', unique: true });
  pgm.createIndex('refresh_tokens', 'expires_at', { name: 'idx_refresh_tokens_expires_at' });
  pgm.createIndex('refresh_tokens', 'revoked_at', { name: 'idx_refresh_tokens_revoked_at' });
};

exports.down = async (pgm) => {
  pgm.dropTable('refresh_tokens');
};