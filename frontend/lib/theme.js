/**
 * KodeChirp Theme Manager
 * Supports 'light' | 'dark' | 'system'
 * Persists to localStorage and synchronizes with document.documentElement[data-theme]
 */

const STORAGE_KEY = 'kc_theme';

export function getThemePreference() {
  if (typeof window === 'undefined') return 'dark';
  try {
    return localStorage.getItem(STORAGE_KEY) || 'system';
  } catch (e) {
    return 'system';
  }
}

export function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function getActiveTheme() {
  const pref = getThemePreference();
  if (pref === 'system') return getSystemTheme();
  return pref === 'light' ? 'light' : 'dark';
}

export function setThemePreference(pref) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch (e) {}

  const active = pref === 'system' ? getSystemTheme() : pref;
  document.documentElement.setAttribute('data-theme', active);
  if (active === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Dispatch event for components or observers
  window.dispatchEvent(new CustomEvent('kc-theme-change', { detail: { pref, active } }));
}

export function initTheme() {
  if (typeof window === 'undefined') return;

  const pref = getThemePreference();
  const active = pref === 'system' ? getSystemTheme() : pref;
  document.documentElement.setAttribute('data-theme', active);
  if (active === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Listen for OS system theme changes
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handleSystemChange = () => {
      if (getThemePreference() === 'system') {
        const newActive = mq.matches ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newActive);
        if (newActive === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        window.dispatchEvent(new CustomEvent('kc-theme-change', { detail: { pref: 'system', active: newActive } }));
      }
    };
    try {
      mq.addEventListener('change', handleSystemChange);
    } catch (e) {
      mq.addListener(handleSystemChange);
    }
  }
}
