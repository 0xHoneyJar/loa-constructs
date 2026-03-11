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
        <div className="mb-4 font-mono text-6xl text-crimson-base">!</div>
        <h1 className="mb-2 font-mono text-xl font-semibold uppercase tracking-wider text-bone-base">
          Something went wrong
        </h1>
        <p className="mx-auto max-w-md text-sm text-bone-dim">
          An unexpected error occurred. This has been logged and we&apos;ll look into it.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-bone-ghost">
            Error ID: {error.digest}
          </p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="border border-cyan-dim bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-wider text-cyan-dim transition-colors hover:bg-cyan-dim hover:text-void-base"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="border border-void-border bg-void-raised px-4 py-2 font-mono text-xs uppercase tracking-wider text-bone-dim transition-colors hover:bg-void-surface hover:text-bone-bright"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
