const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. The system cannot start without a database.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected client error:', err.message);
});
console.log('[DB] Connected to PostgreSQL');

/**
 * Execute a query against the database.
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB] query executed in ${duration}ms`);
  }
  return result;
}

module.exports = { query, pool };
