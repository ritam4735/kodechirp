// gateway/src/routes/monitoring.js
// ─────────────────────────────────────────────────────────────────────────────
// Monitoring & System Events API — gateway-side metrics and event queries
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const { pool } = require('../config/database');
const { getClient } = require('../config/redis');
const { getMetrics } = require('../services/monitorService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /monitoring/metrics — Real-time gateway metrics
 */
router.get('/metrics', (_req, res) => {
  const metrics = getMetrics();
  res.json({
    service: 'kodechirp-gateway',
    ...metrics,
  });
});

/**
 * GET /monitoring/events — Query system events from all services
 */
router.get('/events', async (req, res) => {
  try {
    const {
      event_type,
      severity,
      service,
      submission_id,
      limit = 50,
      offset = 0,
    } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (event_type) {
      conditions.push(`event_type = $${paramIdx++}`);
      params.push(event_type);
    }
    if (severity) {
      conditions.push(`severity = $${paramIdx++}`);
      params.push(severity);
    }
    if (service) {
      conditions.push(`service = $${paramIdx++}`);
      params.push(service);
    }
    if (submission_id) {
      conditions.push(`submission_id = $${paramIdx++}::uuid`);
      params.push(submission_id);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const query = `
      SELECT id, event_type, severity, service, component, message,
             metadata, submission_id, user_id, duration_ms, ip_address,
             created_at
      FROM system_events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;
    params.push(parseInt(limit), parseInt(offset));

    const countQuery = `SELECT COUNT(*) FROM system_events ${whereClause}`;

    const [eventsResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, params.slice(0, -2)),
    ]);

    res.json({
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
      events: eventsResult.rows,
    });
  } catch (err) {
    logger.error({ err }, '[Monitoring] Events query failed');
    res.status(500).json({ error: 'Failed to query events' });
  }
});

/**
 * GET /monitoring/health/deep — Deep system-wide health check
 */
router.get('/health/deep', async (req, res) => {
  const checks = {};
  let overallStatus = 'healthy';

  // Database
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    checks.database = { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'error', error: err.message };
    overallStatus = 'degraded';
  }

  // Redis
  try {
    const redis = getClient();
    const start = Date.now();
    await redis.ping();
    checks.redis = { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    checks.redis = { status: 'error', error: err.message };
    overallStatus = 'degraded';
  }

  // Worker service
  try {
    const config = require('../config');
    const response = await fetch(`${config.worker.apiUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      checks.worker = { status: 'ok' };
    } else {
      checks.worker = { status: 'error', http_status: response.status };
      overallStatus = 'degraded';
    }
  } catch (err) {
    checks.worker = { status: 'unreachable', error: err.message };
    overallStatus = 'critical';
  }

  // Docker proxy (via worker's deep check)
  try {
    const config = require('../config');
    const response = await fetch(`${config.worker.apiUrl}/monitoring/health/deep`, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const workerHealth = await response.json();
      checks.worker_docker = workerHealth.checks?.docker || { status: 'unknown' };
      if (workerHealth.status === 'critical') overallStatus = 'critical';
    }
  } catch {
    checks.worker_docker = { status: 'unknown', error: 'Worker unreachable' };
  }

  // Recent error rate from DB
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE severity IN ('error', 'critical')) as errors
      FROM system_events
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    `);
    const { total, errors } = result.rows[0];
    const errorRate = total > 0 ? (errors / total * 100) : 0;
    checks.error_rate = {
      status: errorRate < 10 ? 'ok' : (errorRate < 25 ? 'warning' : 'critical'),
      error_rate_pct: Math.round(errorRate * 100) / 100,
      total_events_5min: parseInt(total),
      total_errors_5min: parseInt(errors),
    };
    if (errorRate > 25) overallStatus = 'degraded';
    if (errorRate > 50) overallStatus = 'critical';
  } catch {
    checks.error_rate = { status: 'unknown' };
  }

  const statusCode = overallStatus === 'healthy' ? 200
    : overallStatus === 'degraded' ? 503
    : 503;

  res.status(statusCode).json({
    status: overallStatus,
    service: 'kodechirp-system',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

/**
 * GET /monitoring/summary — Aggregated monitoring dashboard data
 */
router.get('/summary', async (req, res) => {
  try {
    const [typeCountsResult, severityCountsResult, recentErrorsResult, perfResult] = await Promise.all([
      pool.query(`
        SELECT event_type, COUNT(*) as count
        FROM system_events
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY event_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT severity, COUNT(*) as count
        FROM system_events
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY severity
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT id, event_type, severity, service, component, message,
               submission_id, duration_ms, created_at
        FROM system_events
        WHERE severity IN ('error', 'critical')
          AND created_at > NOW() - INTERVAL '1 hour'
        ORDER BY created_at DESC
        LIMIT 20
      `),
      pool.query(`
        SELECT
          COUNT(*) as total,
          AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_duration,
          MAX(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as max_duration,
          COUNT(*) FILTER (WHERE severity IN ('error', 'critical')) as errors,
          COUNT(*) FILTER (WHERE service = 'gateway') as gateway_events,
          COUNT(*) FILTER (WHERE service = 'worker') as worker_events
        FROM system_events
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `),
    ]);

    const typeCounts = {};
    typeCountsResult.rows.forEach(r => { typeCounts[r.event_type] = parseInt(r.count); });

    const severityCounts = {};
    severityCountsResult.rows.forEach(r => { severityCounts[r.severity] = parseInt(r.count); });

    const perf = perfResult.rows[0] || {};

    res.json({
      period: 'last_1_hour',
      event_counts_by_type: typeCounts,
      event_counts_by_severity: severityCounts,
      recent_errors: recentErrorsResult.rows,
      performance: {
        total_events: parseInt(perf.total || 0),
        avg_duration_ms: Math.round(parseFloat(perf.avg_duration || 0) * 100) / 100,
        max_duration_ms: parseInt(perf.max_duration || 0),
        total_errors: parseInt(perf.errors || 0),
        gateway_events: parseInt(perf.gateway_events || 0),
        worker_events: parseInt(perf.worker_events || 0),
      },
    });
  } catch (err) {
    logger.error({ err }, '[Monitoring] Summary query failed');
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

/**
 * GET /monitoring/timeline — Event timeline for visualization
 */
router.get('/timeline', async (req, res) => {
  try {
    const { hours = 1 } = req.query;

    const result = await pool.query(`
      SELECT
        date_trunc('minute', created_at) as minute,
        severity,
        COUNT(*) as count
      FROM system_events
      WHERE created_at > NOW() - INTERVAL '${parseInt(hours)} hours'
      GROUP BY minute, severity
      ORDER BY minute ASC
    `);

    // Build timeline buckets
    const timeline = {};
    result.rows.forEach(r => {
      const key = r.minute.toISOString();
      if (!timeline[key]) timeline[key] = { timestamp: key, info: 0, warning: 0, error: 0, critical: 0, debug: 0 };
      timeline[key][r.severity] = parseInt(r.count);
    });

    res.json({
      hours: parseInt(hours),
      buckets: Object.values(timeline),
    });
  } catch (err) {
    logger.error({ err }, '[Monitoring] Timeline query failed');
    res.status(500).json({ error: 'Failed to generate timeline' });
  }
});

module.exports = router;
