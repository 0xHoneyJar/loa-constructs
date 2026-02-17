'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

// dynamic and robots handled via inline meta tags since this is a client component

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, initialize } = useAuthStore();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const expiresIn = searchParams.get('expires_in');

    if (!accessToken || !refreshToken) {
      router.replace('/login?error=missing_tokens');
      return;
    }

    setTokens(accessToken, refreshToken, expiresIn ? parseInt(expiresIn, 10) : undefined);
    initialize().then(() => {
      router.replace('/dashboard');
    });
  }, [searchParams, router, setTokens, initialize]);

  return (
    <>
      <meta name="referrer" content="no-referrer" />
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-tui-accent" />
        <p className="text-xs font-mono text-tui-dim">Signing you in...</p>
      </div>
    </>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="text-center text-tui-dim font-mono text-sm">Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
