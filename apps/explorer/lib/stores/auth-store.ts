'use client';

import { create } from 'zustand';
import Cookies from 'js-cookie';
import {
  registerApi,
  fetchMe,
  type User,
  type LoginRequest,
  type RegisterRequest,
} from '@/lib/api/auth';
import { queryClient } from '@/lib/api/query-client';

type InitResult =
  | { ok: true; user: User }
  | { ok: false; reason: 'timeout' | 'unauthorized' | 'network_error' };

type AuthResult =
  | { ok: true }
  | { ok: false; message: string };

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  initialize: () => Promise<InitResult>;
  login: (data: LoginRequest, rememberMe?: boolean) => Promise<AuthResult>;
  register: (data: RegisterRequest) => Promise<AuthResult>;
  refreshToken: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  getAccessToken: () => string | undefined;
  setTokens: (accessToken: string, refreshToken: string, expiresIn?: number, rememberMe?: boolean) => void;
  clearTokens: () => void;
}

const COOKIE_OPTIONS = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

let refreshPromise: Promise<AuthResult> | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async (): Promise<InitResult> => {
    const accessToken = Cookies.get('access_token');
    if (!accessToken) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return { ok: false, reason: 'unauthorized' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const user = await fetchMe(accessToken);
      clearTimeout(timeout);
      set({ user, isLoading: false, isAuthenticated: true });
      return { ok: true, user };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof DOMException && error.name === 'AbortError') {
        get().clearTokens();
        set({ isLoading: false, isAuthenticated: false, user: null });
        return { ok: false, reason: 'timeout' };
      }

      // Try refresh before giving up
      const refreshResult = await get().refreshToken();
      if (refreshResult.ok) {
        try {
          const newToken = get().getAccessToken();
          if (newToken) {
            const user = await fetchMe(newToken);
            set({ user, isLoading: false, isAuthenticated: true });
            return { ok: true, user };
          }
        } catch {
          // Fall through to unauthorized
        }
      }

      set({ isLoading: false, isAuthenticated: false, user: null });

      if (error instanceof TypeError) {
        return { ok: false, reason: 'network_error' };
      }
      return { ok: false, reason: 'unauthorized' };
    }
  },

  login: async (data, rememberMe = false): Promise<AuthResult> => {
    try {
      // Call route handler — it sets HttpOnly refresh cookie and returns access_token
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        return { ok: false, message: error.message || error.error || 'Login failed' };
      }
      const { access_token, expires_in } = await response.json();
      const expires = rememberMe ? 30 : expires_in ? expires_in / 86400 : 1;
      Cookies.set('access_token', access_token, { ...COOKIE_OPTIONS, expires });
      const user = await fetchMe(access_token);
      set({ user, isAuthenticated: true, isLoading: false });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return { ok: false, message };
    }
  },

  register: async (data): Promise<AuthResult> => {
    try {
      await registerApi(data);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return { ok: false, message };
    }
  },

  refreshToken: async (): Promise<AuthResult> => {
    // Single-flight lock
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async (): Promise<AuthResult> => {
      try {
        // Call route handler — it reads HttpOnly refresh cookie and returns new access_token
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            get().clearTokens();
            set({ user: null, isAuthenticated: false });
            return { ok: false, message: 'Refresh token expired' };
          }

          // Network/server error — retry once after 2s
          await new Promise((r) => setTimeout(r, 2000));
          const retryResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          if (!retryResponse.ok) {
            get().clearTokens();
            set({ user: null, isAuthenticated: false });
            return { ok: false, message: 'Refresh failed after retry' };
          }

          const retryTokens = await retryResponse.json();
          Cookies.set('access_token', retryTokens.access_token, { ...COOKIE_OPTIONS, expires: retryTokens.expires_in ? retryTokens.expires_in / 86400 : 1 });
          return { ok: true };
        }

        const { access_token, expires_in } = await response.json();
        Cookies.set('access_token', access_token, { ...COOKIE_OPTIONS, expires: expires_in ? expires_in / 86400 : 1 });
        return { ok: true };
      } catch (error) {
        if (error instanceof TypeError) {
          // Network error — retry once
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const retryResponse = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });
            if (!retryResponse.ok) {
              get().clearTokens();
              set({ user: null, isAuthenticated: false });
              return { ok: false, message: 'Refresh failed after retry' };
            }
            const retryTokens = await retryResponse.json();
            Cookies.set('access_token', retryTokens.access_token, { ...COOKIE_OPTIONS, expires: retryTokens.expires_in ? retryTokens.expires_in / 86400 : 1 });
            return { ok: true };
          } catch {
            get().clearTokens();
            set({ user: null, isAuthenticated: false });
            return { ok: false, message: 'Refresh failed' };
          }
        }
        get().clearTokens();
        set({ user: null, isAuthenticated: false });
        return { ok: false, message: 'Refresh failed' };
      }
    })().finally(() => {
      refreshPromise = null;
    });

    return refreshPromise;
  },

  logout: async () => {
    const accessToken = get().getAccessToken();
    get().clearTokens();
    queryClient.clear();
    set({ user: null, isAuthenticated: false, isLoading: false });

    // Call route handler — it clears HttpOnly refresh cookie and does best-effort server logout
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      });
    } catch {
      // Best-effort
    }
  },

  getAccessToken: () => Cookies.get('access_token'),

  setTokens: (accessToken, _refreshToken, expiresIn, rememberMe) => {
    const expires = rememberMe ? 30 : expiresIn ? expiresIn / 86400 : 1;
    Cookies.set('access_token', accessToken, { ...COOKIE_OPTIONS, expires });
    // Refresh token is now managed as HttpOnly cookie by route handlers.
    // This method is kept for OAuth callback compatibility.
  },

  clearTokens: () => {
    Cookies.remove('access_token', { path: '/' });
    // Refresh token (HttpOnly) is cleared by /api/auth/logout route handler
  },
}));

export type { User, InitResult, AuthResult };
