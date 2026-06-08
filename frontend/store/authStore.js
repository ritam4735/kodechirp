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
  login: (userData, token) => set({ user: userData, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
