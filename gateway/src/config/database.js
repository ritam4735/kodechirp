// gateway/src/config/database.js
// ─────────────────────────────────────────────────────────────────────────────
// PostgreSQL connection pool
// ─────────────────────────────────────────────────────────────────────────────

const { Pool } = require('pg');
const config = require('./index');
const logger = require('../utils/logger');

if (!config.database.url) {
  throw new Error('DATABASE_URL is required. Cannot start without a database.');
}

const pool = new Pool({
  connectionString: config.database.url,
  min: config.database.poolMin,
  max: config.database.poolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, '[DB] Unexpected pool error');
});

pool.on('connect', () => {
  logger.debug('[DB] New client connected to pool');
});

/**
 * Execute a parameterized query.
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug({ duration, rows: result.rowCount }, '[DB] Query executed');
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error({ err, duration, query: text.substring(0, 100) }, '[DB] Query failed');
    throw err;
  }
}

/**
 * Get a client from the pool for transactions.
 */
async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const originalRelease = client.release.bind(client);

  // Auto-release timeout safety net
  const timeout = setTimeout(() => {
    logger.warn('[DB] Client checked out for >10s, force-releasing');
    client.release(true);
  }, 10000);

  client.release = () => {
    clearTimeout(timeout);
    return originalRelease();
  };

  client.query = (...args) => {
    return originalQuery(...args);
  };

  return client;
}

module.exports = { query, pool, getClient };
