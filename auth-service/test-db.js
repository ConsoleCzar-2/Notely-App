const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres123@localhost:5432/userdb'
});

pool.query('SELECT 1')
  .then(r => console.log('Connected:', r.rows))
  .catch(e => console.error('Error:', e.message))
  .finally(() => pool.end());