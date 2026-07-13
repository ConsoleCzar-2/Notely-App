require('dotenv').config();

module.exports = {
  database: process.env.DATABASE_URL
    ? process.env.DATABASE_URL
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'userdb',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres123',
      },
  migrationsTableName: 'pgmigrations',
  dir: './migrations',
  direction: 'up',
  verbose: true,
  singleTransaction: true,
};