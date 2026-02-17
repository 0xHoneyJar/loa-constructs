'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { verifyEmailApi } from '@/lib/api/auth';
import { publicClient } from '@/lib/api/client';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      verifyEmailApi(token)
        .then(() => setIsVerified(true))
        .catch((err) => setError(err instanceof Error ? err.message : 'Verification failed'))
        .finally(() => setIsLoading(false));
    }
  }, [token]);

  const handleResend = async () => {
    if (!email) return;
    setIsLoading(true);
    setError(null);
    try {
      await publicClient.post('/auth/resend-verification', { email });
      setError(null);
      alert('Verification email sent! Check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend');
    } finally {
      setIsLoading(false);
    }
  };

  if (token && isLoading) {
    return (
      <Panel title="Verifying">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-tui-accent" />
          <p className="text-xs font-mono text-tui-dim">Verifying your email...</p>
        </div>
      </Panel>
    );
  }

  if (isVerified) {
    return (
      <Panel title="Verified">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-base font-mono text-tui-green">Email verified!</h2>
          <p className="text-xs font-mono text-tui-dim">Your email has been successfully verified.</p>
          <Link href="/login">
            <Button>Sign in</Button>
          </Link>
        </div>
      </Panel>
    );
  }

  if (token && error) {
    return (
      <Panel title="Failed" variant="danger">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-base font-mono text-tui-red">Verification failed</h2>
          <p className="text-xs font-mono text-tui-dim">{error}</p>
          <p className="text-xs font-mono text-tui-dim">The link may have expired or is invalid.</p>
          <div className="flex justify-center gap-3">
            <Link href="/login">
              <Button variant="secondary">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Try again</Button>
            </Link>
          </div>
        </div>
      </Panel>
    );
  }

  // No token — show "check your email" state (post-registration)
  return (
    <Panel title="Verify Email">
      <div className="flex flex-col gap-4 text-center">
        <h2 className="text-base font-mono text-tui-accent">Check your email</h2>
        {email && (
          <p className="text-xs font-mono text-tui-dim">
            Verification email sent to <strong className="text-tui-bright">{email}</strong>
          </p>
        )}
        <p className="text-xs font-mono text-tui-dim">
          Click the link in the email to verify your account. Check your spam folder if you don&apos;t see it.
        </p>

        {error && (
          <div className="border border-tui-red bg-tui-red/10 px-3 py-2">
            <p className="text-xs font-mono text-tui-red">{error}</p>
          </div>
        )}

        {email && (
          <Button variant="secondary" onClick={handleResend} disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Resend verification email'}
          </Button>
        )}

        <p className="text-xs font-mono text-tui-dim">
          Already verified?{' '}
          <Link href="/login" className="text-tui-cyan no-underline hover:underline">Sign in</Link>
        </p>
      </div>
    </Panel>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center text-tui-dim font-mono text-sm">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
