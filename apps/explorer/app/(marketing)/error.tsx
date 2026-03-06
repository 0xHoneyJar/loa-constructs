'use client';

import Link from 'next/link';

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-lg font-mono text-bone-base mb-2">Something went wrong</h2>
      <p className="text-sm font-mono text-bone-dim mb-6 max-w-md">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-3 text-sm font-mono">
        <button
          onClick={reset}
          className="border border-bone-ghost px-4 py-2 text-bone-base hover:bg-void-surface transition-colors"
        >
          Try again
        </button>
        <Link href="/" className="border border-bone-ghost px-4 py-2 text-bone-dim hover:bg-void-surface transition-colors">
          Go home
        </Link>
      </div>
    </div>
  );
}
