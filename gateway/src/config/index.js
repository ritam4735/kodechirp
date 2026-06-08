// gateway/src/config/index.js
// ─────────────────────────────────────────────────────────────────────────────
// Centralized configuration from environment variables
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,

  // ── Database ───────────────────────────────────────────────────────────────
  database: {
    url: process.env.DATABASE_URL,
    poolMin: parseInt(process.env.DB_POOL_MIN, 10) || 2,
    poolMax: parseInt(process.env.DB_POOL_MAX, 10) || 10,
  },

  // ── Redis ──────────────────────────────────────────────────────────────────
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // ── JWT ────────────────────────────────────────────────────────────────────
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-CHANGE-IN-PRODUCTION',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-CHANGE-IN-PRODUCTION',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
    refreshExpiresMs: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },

  // ── CORS ───────────────────────────────────────────────────────────────────
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  rateLimit: {
    global:      { window: 60, max: 100 },
    authLogin:   { window: 900, max: 50 },    // 15 min
    authSignup:  { window: 3600, max: 30 },   // 1 hour
    submitRun:   { window: 60, max: 10 },
    submitJudge: { window: 60, max: 5 },
  },

  // ── Worker ─────────────────────────────────────────────────────────────────
  worker: {
    apiUrl: process.env.WORKER_API_URL || 'http://localhost:8000',
  },

  // ── Queue ──────────────────────────────────────────────────────────────────
  queue: {
    submissionQueue: 'kodechirp-submissions',
    resultChannel: 'kodechirp:results',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  },
};

// Validate critical config
if (config.env === 'production') {
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

module.exports = config;
