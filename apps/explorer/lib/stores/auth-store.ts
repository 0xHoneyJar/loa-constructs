'use client';

import { create } from 'zustand';
import Cookies from 'js-cookie';
import {
  loginApi,
  registerApi,
  refreshTokenApi,
  logoutApi,
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
      const tokens = await loginApi(data);
      get().setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in, rememberMe);
      const user = await fetchMe(tokens.access_token);
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
      const refreshToken = Cookies.get('refresh_token');
      if (!refreshToken) {
        return { ok: false, message: 'No refresh token' };
      }

      try {
        const tokens = await refreshTokenApi(refreshToken);
        get().setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
        return { ok: true };
      } catch (error) {
        // Check if it's a 401 from refresh endpoint — clear and fail
        if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
          get().clearTokens();
          set({ user: null, isAuthenticated: false });
          return { ok: false, message: 'Refresh token expired' };
        }

        // Network error — retry once after 2s
        if (error instanceof TypeError) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const tokens = await refreshTokenApi(refreshToken);
            get().setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
            return { ok: true };
          } catch {
            get().clearTokens();
            set({ user: null, isAuthenticated: false });
            return { ok: false, message: 'Refresh failed after retry' };
          }
        }

        // Non-401 server error — retry once
        try {
          const tokens = await refreshTokenApi(refreshToken);
          get().setTokens(tokens.access_token, tokens.refresh_token, tokens.expires_in);
          return { ok: true };
        } catch {
          get().clearTokens();
          set({ user: null, isAuthenticated: false });
          return { ok: false, message: 'Refresh failed' };
        }
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

    if (accessToken) {
      try {
        await logoutApi(accessToken);
      } catch {
        // Best-effort logout on server
      }
    }
  },

  getAccessToken: () => Cookies.get('access_token'),

  setTokens: (accessToken, refreshToken, expiresIn, rememberMe) => {
    const expires = rememberMe ? 30 : expiresIn ? expiresIn / 86400 : 1;
    Cookies.set('access_token', accessToken, { ...COOKIE_OPTIONS, expires });
    Cookies.set('refresh_token', refreshToken, {
      ...COOKIE_OPTIONS,
      expires: rememberMe ? 30 : 7,
    });
  },

  clearTokens: () => {
    Cookies.remove('access_token', { path: '/' });
    Cookies.remove('refresh_token', { path: '/' });
  },
}));

export type { User, InitResult, AuthResult };
