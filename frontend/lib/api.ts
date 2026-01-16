const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SignUpData {
  email: string;
  username: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: User | null;
}

export interface MessageResponse {
  message: string;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new ApiError(error.detail || 'Request failed', response.status);
  }
  return response.json();
}

// Auth API - all requests include credentials for cookie-based auth
export async function signUp(data: SignUpData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse<AuthResponse>(response);
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return handleResponse<AuthResponse>(response);
}

export async function logout(): Promise<MessageResponse> {
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<MessageResponse>(response);
}

export async function refreshTokens(): Promise<MessageResponse> {
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<MessageResponse>(response);
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    credentials: 'include',
  });
  return handleResponse<User>(response);
}

export async function getAuthStatus(): Promise<AuthStatusResponse> {
  const response = await fetch(`${API_URL}/api/auth/status`, {
    credentials: 'include',
  });
  return handleResponse<AuthStatusResponse>(response);
}

// Utility to check if error is auth-related
export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

// Auto-refresh wrapper for authenticated requests
export async function withAutoRefresh<T>(
  requestFn: () => Promise<T>
): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    if (isAuthError(error)) {
      // Try to refresh tokens
      try {
        await refreshTokens();
        // Retry the original request
        return await requestFn();
      } catch {
        // Refresh failed, user needs to login again
        throw error;
      }
    }
    throw error;
  }
}
