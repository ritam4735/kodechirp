import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useEditorStore } from '../store/editorStore';
import { useProblemStore } from '../store/problemStore';
import { api } from '../lib/api';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout } = useAuthStore();

  const handleLogin = useCallback((userData, authToken) => {
    login(userData, authToken);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kc_token', authToken);
        localStorage.setItem('kc_user', JSON.stringify(userData));
      } catch (e) {
        console.error('[Auth] Failed to persist credentials:', e);
      }
    }
  }, [login]);

  const handleLogout = useCallback(async (options = {}) => {
    const { redirectTo = '/thank-you' } = options;

    // 1. Invalidate backend session and refresh tokens
    try {
      await api.logout();
    } catch (err) {
      console.warn('[Auth] Remote session invalidation failed non-fatally:', err);
    }

    // 2. Clear persisted authentication credentials (preserving theme, cookie consent, etc.)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('kc_token');
        localStorage.removeItem('kc_user');
      } catch (e) {
        console.error('[Auth] Failed to remove tokens from storage:', e);
      }
    }

    // 3. Reset in-memory authentication store
    logout();

    // 4. Clear user-specific cached editor and problem state
    try {
      useEditorStore.getState().resetAll();
      useProblemStore.getState().setCurrentProblem(null);
    } catch (e) {
      console.error('[Auth] Failed to reset application stores:', e);
    }

    // 5. Navigate to the Thank You page (using replace to prevent back navigation into protected routes)
    if (typeof window !== 'undefined' && redirectTo) {
      window.location.replace(redirectTo);
    }
  }, [logout]);

  const initAuth = useCallback(() => {
    useAuthStore.getState().initAuth?.();
  }, []);

  return { user, token, isAuthenticated, handleLogin, handleLogout, initAuth };
};
