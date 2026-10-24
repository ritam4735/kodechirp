import { create } from 'zustand';

// Rehydrate from localStorage on creation so state survives refresh
function getInitialState() {
  if (typeof window === 'undefined') {
    return { user: null, token: null, isAuthenticated: false };
  }
  try {
    const token = localStorage.getItem('kc_token');
    const userStr = localStorage.getItem('kc_user');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      return { user, token, isAuthenticated: true };
    }
  } catch {
    // Corrupted storage — fall through to defaults
  }
  return { user: null, token: null, isAuthenticated: false };
}

export const useAuthStore = create((set) => ({
  ...getInitialState(),
  initAuth: () => {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('kc_token');
      const userStr = localStorage.getItem('kc_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        const current = useAuthStore.getState();
        if (current.token !== token || current.user?.id !== user.id || !current.isAuthenticated) {
          set({ user, token, isAuthenticated: true });
        }
        return;
      }
    } catch {
      // Corrupted storage
    }
    const current = useAuthStore.getState();
    if (current.token || current.user || current.isAuthenticated) {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
  login: (userData, token) => set({ user: userData, token, isAuthenticated: true }),
  logout: () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('kc_token');
        localStorage.removeItem('kc_user');
      } catch (e) {
        console.error('[AuthStore] Failed to clear persisted auth items:', e);
      }
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
