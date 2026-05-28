import { useAuthStore } from '../store/authStore';

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
  };

  const initAuth = () => {
    const storedToken = localStorage.getItem('kc_token');
    const storedUser = localStorage.getItem('kc_user');
    if (storedToken && storedUser) {
      try {
        login(JSON.parse(storedUser), storedToken);
      } catch {
        handleLogout();
      }
    }
  };

  return { user, token, isAuthenticated, handleLogin, handleLogout, initAuth };
};
