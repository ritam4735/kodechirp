/**
 * KodeChirp Analytics Service
 * Privacy-first, consent-aware client-side telemetry.
 * Strictly respects GDPR/CCPA and user consent choices.
 */

const CONSENT_KEY = 'kc_cookie_consent';

export function getConsentState() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function setConsentState(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONSENT_KEY, state);
    window.dispatchEvent(new CustomEvent('kc-consent-updated', { detail: state }));
  } catch (e) {
    console.error('Failed to save cookie consent state:', e);
  }
}

export function hasAnalyticsConsent() {
  return getConsentState() === 'all';
}

/**
 * Tracks a page view event across active analytics providers
 */
export function trackPageView(url, title = '') {
  if (typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) return;

  const currentTitle = title || document.title;
  const currentPath = url || window.location.pathname;

  // Google Analytics 4 (if configured)
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: currentPath,
      page_title: currentTitle,
    });
  }

  // Plausible Analytics (if configured)
  if (typeof window.plausible === 'function') {
    window.plausible('pageview', {
      u: window.location.href,
    });
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[Analytics:PageView]', currentPath, currentTitle);
  }
}

/**
 * Tracks custom user interactions and platform milestones
 */
export function trackEvent(eventName, parameters = {}) {
  if (typeof window === 'undefined') return;
  if (!hasAnalyticsConsent()) return;

  // Sanitize properties to prevent sensitive leaks
  const sanitized = { ...parameters };
  delete sanitized.password;
  delete sanitized.email;
  delete sanitized.token;

  // Google Analytics 4
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, sanitized);
  }

  // Plausible custom event
  if (typeof window.plausible === 'function') {
    window.plausible(eventName, { props: sanitized });
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[Analytics:Event]', eventName, sanitized);
  }
}
