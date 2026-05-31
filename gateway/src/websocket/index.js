// gateway/src/websocket/index.js
// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO server setup — Real-time WebSocket gateway
// ─────────────────────────────────────────────────────────────────────────────

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { getClient } = require('../config/redis');
const { REDIS_KEYS, WS_EVENTS } = require('../utils/constants');

/**
 * Initialize Socket.IO server and attach to HTTP server.
 */
function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // ── Authentication middleware ───────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret);
      socket.user = payload;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ──────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    const username = socket.user.username;

    logger.info({ userId, username, socketId: socket.id }, '[WS] Client connected');

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Track online presence
    try {
      const redis = getClient();
      await redis.sadd(REDIS_KEYS.ONLINE_USERS, userId);

      // Broadcast presence update
      const onlineCount = await redis.scard(REDIS_KEYS.ONLINE_USERS);
      io.emit(WS_EVENTS.PRESENCE_UPDATE, { onlineCount });
    } catch (err) {
      logger.error({ err }, '[WS] Failed to track presence');
    }

    // ── Event: Join contest room ────────────────────────────────────────
    socket.on('contest:join', (contestId) => {
      socket.join(`contest:${contestId}`);
      logger.debug({ userId, contestId }, '[WS] Joined contest room');
    });

    socket.on('contest:leave', (contestId) => {
      socket.leave(`contest:${contestId}`);
    });

    // ── Event: Subscribe to submission updates ──────────────────────────
    socket.on('submission:subscribe', (submissionId) => {
      socket.join(`submission:${submissionId}`);
      logger.debug({ userId, submissionId }, '[WS] Subscribed to submission');
    });

    // ── Disconnect handler ──────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      logger.info({ userId, reason }, '[WS] Client disconnected');

      try {
        const redis = getClient();
        await redis.srem(REDIS_KEYS.ONLINE_USERS, userId);

        const onlineCount = await redis.scard(REDIS_KEYS.ONLINE_USERS);
        io.emit(WS_EVENTS.PRESENCE_UPDATE, { onlineCount });
      } catch (err) {
        logger.error({ err }, '[WS] Failed to update presence on disconnect');
      }
    });
  });

  logger.info('[WS] Socket.IO server initialized');

  return io;
}

module.exports = { initSocketIO };
