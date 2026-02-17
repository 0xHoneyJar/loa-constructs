'use client';

import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center py-12">
      <Panel title="Error" variant="danger" className="max-w-md">
        <div className="flex flex-col gap-4 text-center">
          <h2 className="text-base font-mono text-tui-red">Something went wrong</h2>
          <p className="text-xs font-mono text-tui-dim">{error.message || 'An unexpected error occurred.'}</p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={reset}>
              Try again
            </Button>
            <Link href="/dashboard">
              <Button>Return to dashboard</Button>
            </Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
