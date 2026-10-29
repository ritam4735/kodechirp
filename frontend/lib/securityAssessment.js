// frontend/lib/securityAssessment.js
// ─────────────────────────────────────────────────────────────────────────────
// Secure Assessment Mode Utilities: Fullscreen API, Prohibited Event Detection,
// Browser Limitations, and Human-Readable Formats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if Fullscreen API is supported by the client browser
 */
export function isFullscreenSupported() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled
  );
}

/**
 * Check if the document is currently in full-screen mode
 */
export function isFullscreenActive() {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
}

/**
 * Request full-screen display for an element (defaults to document.documentElement)
 * Must be invoked directly within an explicit user gesture (e.g. click event)
 */
export async function enterFullscreen(elem = (typeof document !== 'undefined' ? document.documentElement : null)) {
  if (!elem) {
    throw new Error('Full-screen request failed: document element is not available.');
  }

  const requestMethod =
    elem.requestFullscreen ||
    elem.webkitRequestFullscreen ||
    elem.mozRequestFullScreen ||
    elem.msRequestFullscreen;

  if (!requestMethod) {
    throw new Error('Your browser or operating system does not support the Fullscreen API.');
  }

  try {
    await requestMethod.call(elem);
  } catch (err) {
    throw new Error(
      err?.message ||
      'Full-screen permission was denied. Please allow full-screen mode to begin this secure assessment.'
    );
  }
}

/**
 * Safely exit full-screen mode if currently active
 */
export async function exitFullscreen() {
  if (typeof document === 'undefined') return;
  if (!isFullscreenActive()) return;

  const exitMethod =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;

  if (exitMethod) {
    try {
      await exitMethod.call(document);
    } catch {
      // Ignored if full-screen was already dismissed
    }
  }
}

/**
 * Supported vendor full-screen event names
 */
export const FULLSCREEN_CHANGE_EVENTS = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
];

/**
 * Violation reasons and user-facing labels
 */
export const VIOLATION_DETAILS_MAP = {
  tab_hidden: {
    title: 'Tab Switched / Document Hidden',
    description: 'The assessment window was minimized or you switched to another browser tab.',
    icon: 'tab',
    severity: 'critical',
  },
  fullscreen_exited: {
    title: 'Full-Screen Exited',
    description: 'Full-screen mode was exited during strict secure assessment.',
    icon: 'fullscreen',
    severity: 'critical',
  },
  navigation_attempt: {
    title: 'Navigation Attempted',
    description: 'Browser back, reload, or page navigation away from the active exam was attempted.',
    icon: 'navigation',
    severity: 'critical',
  },
  timer_expired: {
    title: 'Time Expired',
    description: 'Authoritative server assessment countdown reached zero.',
    icon: 'clock',
    severity: 'info',
  },
  manual: {
    title: 'Manual Submission',
    description: 'Submitted voluntarily by candidate.',
    icon: 'check',
    severity: 'info',
  },
  copy_attempt: {
    title: 'Clipboard Copy Prohibited',
    description: 'Copying question text or exam materials is restricted in secure mode.',
    icon: 'shield',
    severity: 'warning',
  },
  paste_attempt: {
    title: 'Clipboard Paste Prohibited',
    description: 'Pasting external content is restricted in secure mode.',
    icon: 'shield',
    severity: 'warning',
  },
  context_menu_attempt: {
    title: 'Context Menu Disabled',
    description: 'Right-click context menu is restricted in secure mode.',
    icon: 'shield',
    severity: 'warning',
  },
  drag_drop_attempt: {
    title: 'Drag and Drop Prohibited',
    description: 'Dragging exam content to external windows is restricted.',
    icon: 'shield',
    severity: 'warning',
  },
};

export function getViolationMeta(reason) {
  return VIOLATION_DETAILS_MAP[reason] || {
    title: 'Security Violation',
    description: 'A prohibited browser action was detected during the assessment.',
    icon: 'alert',
    severity: 'critical',
  };
}

/**
 * Documented browser API capabilities and limitations for security enforcement
 */
export const BROWSER_SECURITY_CAPABILITIES = {
  fullscreen: {
    supported: true,
    capability: 'Enforces immersive examination workspace with fullscreenchange detection.',
    limitation: 'Does not block secondary monitors, OS notifications, or multi-window OS configurations without external MDM/kiosk software.',
  },
  visibility: {
    supported: true,
    capability: 'Detects background tab switches and browser minimization via visibilitychange.',
    limitation: 'Window blur alone is not used because OS dialogs and accessibility tools trigger false positives.',
  },
  navigation: {
    supported: true,
    capability: 'Traps popstate history events and triggers beforeunload warning prompts.',
    limitation: 'Hard browser process kills (kill -9, sudden power loss) rely on backend authoritative timer recovery.',
  },
  clipboard: {
    supported: true,
    capability: 'Scoped event listener blocking for copy, cut, paste, context menu, and dragging.',
    limitation: 'Acts as deterrent; cannot block physical cameras, OS-level screen grabbers, or external hardware.',
  },
};
