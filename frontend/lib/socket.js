// frontend/lib/socket.js
// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO client for real-time WebSocket communication
// ─────────────────────────────────────────────────────────────────────────────

import { io } from 'socket.io-client';

let socket = null;

/**
 * Get or create the Socket.IO connection.
 * Authenticates using the stored JWT access token.
 */
export function getSocket(token) {
  if (socket?.connected) return socket;

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

  socket = io(wsUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[WS] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[WS] Connection error:', err.message);
  });

  return socket;
}

/**
 * Disconnect the socket.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to submission result updates.
 */
export function onSubmissionResult(callback) {
  const s = socket;
  if (!s) return () => {};

  s.on('submission:result', callback);
  return () => s.off('submission:result', callback);
}

/**
 * Subscribe to submission progress updates.
 */
export function onSubmissionProgress(callback) {
  const s = socket;
  if (!s) return () => {};

  s.on('submission:progress', callback);
  return () => s.off('submission:progress', callback);
}

/**
 * Subscribe to a specific submission's updates.
 */
export function subscribeToSubmission(submissionId) {
  if (socket) {
    socket.emit('submission:subscribe', submissionId);
  }
}

/**
 * Subscribe to contest room updates.
 */
export function joinContestRoom(contestId) {
  if (socket) {
    socket.emit('contest:join', contestId);
  }
}

export function leaveContestRoom(contestId) {
  if (socket) {
    socket.emit('contest:leave', contestId);
  }
}

/**
 * Subscribe to online presence updates.
 */
export function onPresenceUpdate(callback) {
  const s = socket;
  if (!s) return () => {};

  s.on('presence:update', callback);
  return () => s.off('presence:update', callback);
}
