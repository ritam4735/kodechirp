// gateway/src/services/monitorService.js
// ─────────────────────────────────────────────────────────────────────────────
// Gateway-side monitoring service — tracks API requests, auth events,
// queue operations, and service health changes
// ─────────────────────────────────────────────────────────────────────────────

const { pool } = require('../config/database');
const logger = require('../utils/logger');

// ── Event Types ─────────────────────────────────────────────────────────────

const EventType = {
  // HTTP / API
  API_REQUEST_SLOW:      'api.request_slow',
  API_ERROR_500:         'api.error_500',
  API_ERROR_4XX:         'api.error_4xx',

  // Auth
  AUTH_LOGIN_SUCCESS:    'auth.login_success',
  AUTH_LOGIN_FAILED:     'auth.login_failed',
  AUTH_SIGNUP:           'auth.signup',
  AUTH_TOKEN_REFRESH:    'auth.token_refresh',
  AUTH_RATE_LIMITED:     'auth.rate_limited',

  // Submissions
  SUBMISSION_QUEUED:     'submission.queued',
  SUBMISSION_RUN:        'submission.run',
  SUBMISSION_RUN_FAIL:   'submission.run_fail',

  // Service health
  SERVICE_START:         'service.start',
  SERVICE_DEGRADED:      'service.degraded',
  WORKER_UNREACHABLE:    'service.worker_unreachable',
  DB_SLOW_QUERY:         'db.slow_query',
  REDIS_ERROR:           'redis.error',
};

const Severity = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

// ── In-memory Metrics ───────────────────────────────────────────────────────

const metrics = {
  startedAt: new Date().toISOString(),
  lastEventAt: null,
  eventCounts: {},
  severityCounts: {},
  requestCounts: { total: 0, '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
  requestDurations: [],
  endpointStats: {},
};

// ── Write Queue ─────────────────────────────────────────────────────────────

const writeQueue = [];
let flushTimer = null;
const FLUSH_INTERVAL_MS = 2000;
const BATCH_SIZE = 50;

function startFlusher() {
  if (flushTimer) return;
  flushTimer = setInterval(flushBatch, FLUSH_INTERVAL_MS);
}

async function flushBatch() {
  if (writeQueue.length === 0) return;

  const batch = writeQueue.splice(0, BATCH_SIZE);
  const values = [];
  const placeholders = [];

  batch.forEach((e, i) => {
    const offset = i * 10;
    placeholders.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}::jsonb, $${offset + 7}::uuid, $${offset + 8}::uuid, $${offset + 9}, $${offset + 10}::inet)`
    );
    values.push(
      e.event_type, e.severity, e.service, e.component, e.message,
      JSON.stringify(e.metadata || {}),
      e.submission_id || null, e.user_id || null,
      e.duration_ms || null, e.ip_address || null
    );
  });

  try {
    await pool.query(
      `INSERT INTO system_events
         (event_type, severity, service, component, message, metadata,
          submission_id, user_id, duration_ms, ip_address)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  } catch (err) {
    logger.error({ err, batchSize: batch.length }, '[Monitor] Failed to flush events');
  }
}

// ── Core Record Function ────────────────────────────────────────────────────

function record({
  eventType,
  severity = Severity.INFO,
  service = 'gateway',
  component = null,
  message,
  metadata = {},
  submissionId = null,
  userId = null,
  durationMs = null,
  ipAddress = null,
}) {
  const now = new Date().toISOString();

  // Update in-memory metrics
  metrics.eventCounts[eventType] = (metrics.eventCounts[eventType] || 0) + 1;
  metrics.severityCounts[severity] = (metrics.severityCounts[severity] || 0) + 1;
  metrics.lastEventAt = now;

  // Queue for DB write
  writeQueue.push({
    event_type: eventType,
    severity,
    service,
    component,
    message,
    metadata,
    submission_id: submissionId,
    user_id: userId,
    duration_ms: durationMs,
    ip_address: ipAddress,
  });

  // Trim queue if too large (backpressure)
  if (writeQueue.length > 10000) {
    writeQueue.splice(0, writeQueue.length - 5000);
    logger.warn('[Monitor] Write queue overflow, dropped oldest events');
  }

  startFlusher();
}

// ── Convenience Methods ─────────────────────────────────────────────────────

function recordRequest(req, res, durationMs) {
  const status = res.statusCode;
  metrics.requestCounts.total++;

  if (status < 300) metrics.requestCounts['2xx']++;
  else if (status < 400) metrics.requestCounts['3xx']++;
  else if (status < 500) metrics.requestCounts['4xx']++;
  else metrics.requestCounts['5xx']++;

  // Track per-endpoint stats
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  if (!metrics.endpointStats[endpoint]) {
    metrics.endpointStats[endpoint] = { count: 0, totalMs: 0, errors: 0 };
  }
  metrics.endpointStats[endpoint].count++;
  metrics.endpointStats[endpoint].totalMs += durationMs;
  if (status >= 500) metrics.endpointStats[endpoint].errors++;

  // Keep last 1000 durations for p50/p99
  metrics.requestDurations.push(durationMs);
  if (metrics.requestDurations.length > 1000) {
    metrics.requestDurations = metrics.requestDurations.slice(-500);
  }

  // Record slow requests (>2s)
  if (durationMs > 2000) {
    record({
      eventType: EventType.API_REQUEST_SLOW,
      severity: Severity.WARNING,
      component: 'http',
      message: `Slow request: ${req.method} ${req.path} (${durationMs}ms)`,
      metadata: { method: req.method, path: req.path, status, durationMs },
      userId: req.user?.id,
      durationMs,
      ipAddress: req.ip,
    });
  }

  // Record 5xx errors
  if (status >= 500) {
    record({
      eventType: EventType.API_ERROR_500,
      severity: Severity.ERROR,
      component: 'http',
      message: `Server error: ${req.method} ${req.path} → ${status}`,
      metadata: { method: req.method, path: req.path, status },
      userId: req.user?.id,
      durationMs,
      ipAddress: req.ip,
    });
  }
}

function recordSubmissionQueued(submissionId, userId, language, problemId) {
  record({
    eventType: EventType.SUBMISSION_QUEUED,
    severity: Severity.INFO,
    component: 'submissionService',
    message: `Submission ${submissionId} queued (${language})`,
    metadata: { language, problemId },
    submissionId,
    userId,
  });
}

function recordRunCode(language, durationMs, success, ipAddress) {
  record({
    eventType: success ? EventType.SUBMISSION_RUN : EventType.SUBMISSION_RUN_FAIL,
    severity: success ? Severity.INFO : Severity.WARNING,
    component: 'submissionService',
    message: `Run code ${success ? 'succeeded' : 'failed'} (${language}, ${durationMs}ms)`,
    metadata: { language },
    durationMs,
    ipAddress,
  });
}

function recordAuthEvent(eventType, userId, ipAddress, metadata = {}) {
  record({
    eventType,
    severity: Severity.INFO,
    component: 'authService',
    message: `Auth event: ${eventType}`,
    metadata,
    userId,
    ipAddress,
  });
}

function recordWorkerUnreachable(error) {
  record({
    eventType: EventType.WORKER_UNREACHABLE,
    severity: Severity.CRITICAL,
    component: 'submissionService',
    message: `Worker service unreachable: ${error}`,
    metadata: { error },
  });
}

function recordServiceStart() {
  record({
    eventType: EventType.SERVICE_START,
    severity: Severity.INFO,
    component: 'server',
    message: 'KodeChirp Gateway started',
  });
}

// ── Metrics Getter ──────────────────────────────────────────────────────────

function getMetrics() {
  const durations = [...metrics.requestDurations].sort((a, b) => a - b);
  const p50 = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
  const p99 = durations.length > 0 ? durations[Math.floor(durations.length * 0.99)] : 0;
  const avg = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  return {
    uptime_since: metrics.startedAt,
    last_event_at: metrics.lastEventAt,
    total_events: Object.values(metrics.eventCounts).reduce((a, b) => a + b, 0),
    event_counts: { ...metrics.eventCounts },
    severity_counts: { ...metrics.severityCounts },
    request_stats: {
      ...metrics.requestCounts,
      avg_ms: avg,
      p50_ms: p50,
      p99_ms: p99,
    },
    endpoint_stats: { ...metrics.endpointStats },
  };
}

// ── Shutdown ────────────────────────────────────────────────────────────────

async function shutdown() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flushBatch();
}

module.exports = {
  EventType,
  Severity,
  record,
  recordRequest,
  recordSubmissionQueued,
  recordRunCode,
  recordAuthEvent,
  recordWorkerUnreachable,
  recordServiceStart,
  getMetrics,
  shutdown,
};
