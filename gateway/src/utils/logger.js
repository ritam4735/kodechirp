// gateway/src/utils/logger.js
// ─────────────────────────────────────────────────────────────────────────────
// Structured logging with pino
// ─────────────────────────────────────────────────────────────────────────────

const pino = require('pino');
const config = require('../config');

const logger = pino({
  level: config.env === 'production' ? 'info' : 'debug',
  transport: config.env !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
  base: { service: 'kodechirp-gateway' },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.ip,
    }),
  },
});

module.exports = logger;
