import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/auth';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login: storeLogin, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

  const login = useCallback(async (employeeId: string, password: string) => {
    const { user, accessToken } = await authApi.login(employeeId, password);
    storeLogin(user, accessToken);
    navigate('/');
  }, [storeLogin, navigate]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      storeLogout();
      navigate('/login');
    }
  }, [storeLogout, navigate]);

  const checkAuth = useCallback(async () => {
    try {
      const userData = await authApi.me();
      useAuthStore.getState().setUser(userData);
    } catch {
      storeLogout();
    }
  }, [storeLogout]);

  return { user, isAuthenticated, isLoading, login, logout, checkAuth };
}
