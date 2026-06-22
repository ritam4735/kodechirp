import { useAuthStore } from '../store/authStore';
import { useEditorStore } from '../store/editorStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout } = useAuthStore();

  const handleLogin = (userData, authToken) => {
    login(userData, authToken);
    localStorage.setItem('kc_token', authToken);
    localStorage.setItem('kc_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_user');
    useEditorStore.getState().resetAll();
  };

  // initAuth kept for backward compat but is now a no-op;
  // the store rehydrates itself synchronously from localStorage.
  const initAuth = () => {};

  return { user, token, isAuthenticated, handleLogin, handleLogout, initAuth };
};
