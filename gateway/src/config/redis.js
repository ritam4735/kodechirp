// gateway/src/config/redis.js
// ─────────────────────────────────────────────────────────────────────────────
// Redis client factory — shared connection for rate limiting, caching, pub/sub
// ─────────────────────────────────────────────────────────────────────────────

const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let client = null;
let subscriber = null;

/**
 * Get or create the primary Redis client (commands).
 */
function getClient() {
  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,  // Required by BullMQ
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        logger.warn({ times, delay }, '[Redis] Reconnecting...');
        return delay;
      },
    });

    client.on('connect', () => logger.info('[Redis] Connected'));
    client.on('error', (err) => logger.error({ err }, '[Redis] Connection error'));
    client.on('close', () => logger.warn('[Redis] Connection closed'));
  }
  return client;
}

/**
 * Get or create a dedicated subscriber client (for pub/sub).
 * BullMQ and pub/sub need separate connections.
 */
function getSubscriber() {
  if (!subscriber) {
    subscriber = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy(times) {
        return Math.min(times * 200, 5000);
      },
    });

    subscriber.on('connect', () => logger.info('[Redis] Subscriber connected'));
    subscriber.on('error', (err) => logger.error({ err }, '[Redis] Subscriber error'));
  }
  return subscriber;
}

/**
 * Gracefully close all Redis connections.
 */
async function closeAll() {
  const promises = [];
  if (client) promises.push(client.quit());
  if (subscriber) promises.push(subscriber.quit());
  await Promise.allSettled(promises);
  client = null;
  subscriber = null;
}

module.exports = { getClient, getSubscriber, closeAll };
