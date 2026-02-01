'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6">
        <div className="mb-4 font-mono text-6xl text-domain-security">!</div>
        <h1 className="mb-2 font-mono text-xl font-semibold uppercase tracking-wider text-white">
          Something went wrong
        </h1>
        <p className="mx-auto max-w-md text-sm text-white/60">
          An unexpected error occurred. This has been logged and we&apos;ll look into it.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-white/30">
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-domain-docs bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-wider text-domain-docs transition-colors hover:bg-domain-docs hover:text-background"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-md border border-border bg-surface px-4 py-2 font-mono text-xs uppercase tracking-wider text-white/60 transition-colors hover:bg-surface hover:text-white"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
