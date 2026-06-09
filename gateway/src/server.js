// gateway/src/server.js
// ─────────────────────────────────────────────────────────────────────────────
// KodeChirp API Gateway — Express + Socket.IO + BullMQ + Redis
// ─────────────────────────────────────────────────────────────────────────────

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const config = require('./config');
const logger = require('./utils/logger');
const { pool } = require('./config/database');
const { getClient, closeAll: closeRedis } = require('./config/redis');
const { initSocketIO } = require('./websocket');
const { initResultListener } = require('./queue/events');
const { closeQueue } = require('./queue/producer');
const { globalLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// ── Middleware Stack ──────────────────────────────────────────────────────────

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Managed by frontend
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Global rate limiting
app.use(globalLimiter);

// ── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',        require('./routes/auth'));
app.use('/api/profile',     require('./routes/profile'));
app.use('/api/problems',    require('./routes/problems'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/contests',    require('./routes/contests'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/chirps',      require('./routes/chirps'));
app.use('/api/admin',       require('./routes/admin'));
app.use('/health',          require('./routes/health'));

// ── 404 handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Error handler ────────────────────────────────────────────────────────────

app.use(errorHandler);

// ── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  try {
    // Verify database connection
    await pool.query('SELECT NOW()');
    logger.info('[DB] PostgreSQL connected successfully');

    // Verify Redis connection
    const redis = getClient();
    await redis.ping();
    logger.info('[Redis] Connected successfully');

    // Initialize WebSocket
    const io = initSocketIO(server);

    // Initialize result listener (Redis Pub/Sub → WebSocket)
    await initResultListener(io);

    // Start HTTP server
    server.listen(config.port, () => {
      logger.info({
        port: config.port,
        env: config.env,
        cors: config.cors.origin,
      }, `🐦 KodeChirp API Gateway running on http://localhost:${config.port}`);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start gateway');
    process.exit(1);
  }
}

// ── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down gracefully...');

  server.close(async () => {
    try {
      await closeQueue();
      await closeRedis();
      await pool.end();
      logger.info('All connections closed');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force exit after 15s
  setTimeout(() => {
    logger.warn('Forced shutdown after timeout');
    process.exit(1);
  }, 15000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

start();
