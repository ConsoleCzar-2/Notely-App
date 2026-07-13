/**
 * Initial migration - Create auth_users table
 * Run with: npm run migrate up
 */

exports.up = async (pgm) => {
  // Create auth_users table
  pgm.createTable('auth_users', {
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
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
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

  // Create indexes for faster lookups
  pgm.createIndex('auth_users', 'email', { name: 'idx_auth_users_email' });
  pgm.createIndex('auth_users', 'user_id', { name: 'idx_auth_users_user_id' });
  pgm.createIndex('auth_users', 'username', { name: 'idx_auth_users_username' });

  // Create trigger function to update updated_at timestamp
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true,
    },
    `
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    `
  );

  // Create trigger to automatically update updated_at
  pgm.createTrigger('auth_users', 'update_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'update_updated_at_column',
  });
};

exports.down = async (pgm) => {
  // Drop trigger first
  pgm.dropTrigger('auth_users', 'update_updated_at');
  
  // Drop function
  pgm.dropFunction('update_updated_at_column', []);
  
  // Drop table (indexes will be dropped automatically)
  pgm.dropTable('auth_users');
};