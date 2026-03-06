'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { createAuthClient } from '@/lib/api/client';

// Module-level singleton so authClient is created once
let authClientInstance: ReturnType<typeof createAuthClient> | null = null;

export function getAuthClient() {
  if (!authClientInstance) {
    throw new Error('AuthInitializer must mount before getAuthClient() is called');
  }
  return authClientInstance;
}

interface AuthInitializerProps {
  children: ReactNode;
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const router = useRouter();
  const { initialize, getAccessToken, refreshToken, logout } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const initialized = useRef(false);

  // Wire up DI for authClient on first mount
  useEffect(() => {
    if (!authClientInstance) {
      authClientInstance = createAuthClient({
        getToken: () => getAccessToken(),
        onRefresh: async () => {
          const result = await refreshToken();
          if (!result.ok) throw new Error('refresh failed');
        },
        onAuthFailure: () => {
          logout().then(() => {
            window.location.href = '/login';
          });
        },
      });
    }
  }, [getAccessToken, refreshToken, logout]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initialize().then((result) => {
      if (result.ok) {
        setStatus('ready');
      } else if (result.reason === 'network_error') {
        setStatus('error');
      } else {
        // timeout or unauthorized
        router.replace('/login');
      }
    });
  }, [initialize, router]);

  // Token refresh interval (14 min)
  useEffect(() => {
    if (status !== 'ready') return;

    let intervalId: ReturnType<typeof setInterval>;

    const startRefresh = () => {
      intervalId = setInterval(() => {
        refreshToken();
      }, 14 * 60 * 1000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        refreshToken(); // Refresh immediately on return
        startRefresh();
      }
    };

    startRefresh();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [status, refreshToken]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-void-base">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-cyan-base" />
          <p className="text-sm font-mono text-bone-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-void-base">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm font-mono text-crimson-base">Network error. Could not reach the server.</p>
          <button
            onClick={() => {
              setStatus('loading');
              initialized.current = false;
              initialize().then((result) => {
                if (result.ok) setStatus('ready');
                else if (result.reason === 'network_error') setStatus('error');
                else router.replace('/login');
              });
            }}
            className="border border-void-border px-4 py-2 text-sm font-mono text-bone-base hover:bg-bone-muted/10"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
