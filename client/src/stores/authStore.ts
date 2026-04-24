import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Role {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}

export interface Permission {
  module: string;
  canView: boolean;
  canEdit: boolean;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  status: string;
  roles: Role[];
  permissions: Permission[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (token) => set({ accessToken: token }),
      setIsLoading: (isLoading) => set({ isLoading }),
      login: (user, accessToken) => set({ user, accessToken, isAuthenticated: true, isLoading: false }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
