// gateway/src/utils/constants.js
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  // Submission statuses
  STATUS: {
    QUEUED: 'queued',
    RUNNING: 'running',
    ACCEPTED: 'Accepted',
    WRONG_ANSWER: 'Wrong Answer',
    TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
    RUNTIME_ERROR: 'Runtime Error',
    COMPILATION_ERROR: 'Compilation Error',
    MEMORY_LIMIT_EXCEEDED: 'Memory Limit Exceeded',
    INTERNAL_ERROR: 'Internal Error',
  },

  // User roles
  ROLES: {
    USER: 'user',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
  },

  // Supported languages
  LANGUAGES: ['javascript', 'python', 'cpp', 'c', 'java'],

  // Contest statuses
  CONTEST_STATUS: {
    UPCOMING: 'upcoming',
    ACTIVE: 'active',
    ENDED: 'ended',
  },

  // WebSocket events
  WS_EVENTS: {
    SUBMISSION_QUEUED: 'submission:queued',
    SUBMISSION_PROGRESS: 'submission:progress',
    SUBMISSION_RESULT: 'submission:result',
    CONTEST_UPDATE: 'contest:update',
    LEADERBOARD_UPDATE: 'leaderboard:update',
    NOTIFICATION: 'notification',
    PRESENCE_UPDATE: 'presence:update',
  },

  // Redis key prefixes
  REDIS_KEYS: {
    RATE_LIMIT: 'rl:',
    SESSION: 'session:',
    USER_CACHE: 'user:',
    ONLINE_USERS: 'online:users',
  },
};
