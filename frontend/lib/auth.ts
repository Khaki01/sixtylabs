// Re-export from auth store for backwards compatibility
// This file is kept for any components that may import from here
export { useAuthStore } from '@/lib/stores/auth-store';

// Simple hook for checking auth status
export function useAuth() {
  const { user, isAuthenticated, isLoading, checkAuth, logout } = useAuthStore();
  return { user, isAuthenticated, isLoading, checkAuth, logout };
}

// Import the store for use in hook
import { useAuthStore } from '@/lib/stores/auth-store';
