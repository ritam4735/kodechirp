// gateway/src/routes/health.js
// ─────────────────────────────────────────────────────────────────────────────
// Health check & system status endpoints
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { pool } = require('../config/database');
const { getClient } = require('../config/redis');
const { getQueueMetrics } = require('../queue/producer');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /health — Basic health check
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'kodechirp-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/detailed — Detailed system health
 */
router.get('/detailed', async (_req, res) => {
  const checks = {};

  // Database
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    checks.database = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'error', error: err.message };
  }

  // Redis
  try {
    const redis = getClient();
    const start = Date.now();
    await redis.ping();
    checks.redis = { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    checks.redis = { status: 'error', error: err.message };
  }

  // Queue
  try {
    const metrics = await getQueueMetrics();
    checks.queue = { status: 'ok', ...metrics };
  } catch (err) {
    checks.queue = { status: 'error', error: err.message };
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    service: 'kodechirp-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks,
  });
});

module.exports = router;
