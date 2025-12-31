/**
 * Auth Context Provider
 * @see sprint.md T5.5: JWT handling, session management, useAuth hook
 */

'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import Cookies from 'js-cookie';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getAccessToken: () => string | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const setTokens = useCallback((accessToken: string, refreshToken: string, rememberMe = false) => {
    const options: Cookies.CookieAttributes = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    };

    if (rememberMe) {
      options.expires = 30; // 30 days
    }

    Cookies.set(ACCESS_TOKEN_KEY, accessToken, options);
    Cookies.set(REFRESH_TOKEN_KEY, refreshToken, options);
  }, []);

  const clearTokens = useCallback(() => {
    Cookies.remove(ACCESS_TOKEN_KEY);
    Cookies.remove(REFRESH_TOKEN_KEY);
  }, []);

  const getAccessToken = useCallback(() => {
    return Cookies.get(ACCESS_TOKEN_KEY);
  }, []);

  const getRefreshToken = useCallback(() => {
    return Cookies.get(REFRESH_TOKEN_KEY);
  }, []);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    const accessToken = getAccessToken();
    if (!accessToken) return null;

    try {
      const response = await fetch(`${API_URL}/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return null;
        }
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      return data.user;
    } catch {
      return null;
    }
  }, [getAccessToken]);

  const refreshToken = useCallback(async (): Promise<void> => {
    const token = getRefreshToken();
    if (!token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: token }),
    });

    if (!response.ok) {
      clearTokens();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken);
  }, [getRefreshToken, setTokens, clearTokens]);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false): Promise<void> => {
      const response = await fetch(`${API_URL}/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken, rememberMe);
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    },
    [setTokens]
  );

  const register = useCallback(
    async (email: string, password: string, name?: string): Promise<void> => {
      const response = await fetch(`${API_URL}/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      setTokens(data.accessToken, data.refreshToken);
      setState({
        user: data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    },
    [setTokens]
  );

  const logout = useCallback(async (): Promise<void> => {
    const accessToken = getAccessToken();

    try {
      if (accessToken) {
        await fetch(`${API_URL}/v1/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      }
    } catch {
      // Ignore logout errors - clear tokens anyway
    }

    clearTokens();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, [getAccessToken, clearTokens]);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const user = await fetchUser();

      if (user) {
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        // Try to refresh token if we have one
        const token = getRefreshToken();
        if (token) {
          try {
            await refreshToken();
            const refreshedUser = await fetchUser();
            setState({
              user: refreshedUser,
              isLoading: false,
              isAuthenticated: !!refreshedUser,
            });
          } catch {
            clearTokens();
            setState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
            });
          }
        } else {
          setState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    initAuth();
  }, [fetchUser, getRefreshToken, refreshToken, clearTokens]);

  // Set up token refresh interval
  useEffect(() => {
    if (!state.isAuthenticated) return;

    // Refresh token every 14 minutes (tokens typically expire at 15 minutes)
    const interval = setInterval(
      () => {
        refreshToken().catch(() => {
          // If refresh fails, user will be logged out on next protected action
        });
      },
      14 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [state.isAuthenticated, refreshToken]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshToken,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
