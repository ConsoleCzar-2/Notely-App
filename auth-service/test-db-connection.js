const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres123@localhost:5432/userdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => console.log('Connected'));
pool.on('error', (err) => console.error('Pool error:', err));

async function test() {
  try {
    const client = await pool.connect();
    console.log('Connection successful');
    client.release();
  } catch (err) {
    console.error('Error:', err);
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error stack:', err.stack);
  } finally {
    await pool.end();
  }
}

test();