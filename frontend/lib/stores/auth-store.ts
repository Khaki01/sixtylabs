import { create } from 'zustand';
import { User, getAuthStatus, login as apiLogin, signUp as apiSignUp, logout as apiLogout, LoginData, SignUpData, SignupResponse } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  signUp: (data: SignUpData) => Promise<SignupResponse>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const status = await getAuthStatus();
      set({
        user: status.user,
        isAuthenticated: status.authenticated,
        isLoading: false,
      });
    } catch {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  login: async (data: LoginData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiLogin(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  signUp: async (data: SignUpData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiSignUp(data);
      // Don't set authenticated - user needs to confirm email first
      set({ isLoading: false });
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      await apiLogout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (err: unknown) {
      // Even if logout fails on server, clear local state
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
