import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useEditorStore } from '../store/editorStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout } = useAuthStore();

  const handleLogin = useCallback((userData, authToken) => {
    login(userData, authToken);
    localStorage.setItem('kc_token', authToken);
    localStorage.setItem('kc_user', JSON.stringify(userData));
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
    localStorage.removeItem('kc_token');
    localStorage.removeItem('kc_user');
    useEditorStore.getState().resetAll();
  }, [logout]);

  const initAuth = useCallback(() => {
    useAuthStore.getState().initAuth?.();
  }, []);

  return { user, token, isAuthenticated, handleLogin, handleLogout, initAuth };
};
