'use client';

import { useAuthStore } from '@/lib/stores/auth-store';

const CONVEX_AVAILABLE = !!process.env.NEXT_PUBLIC_CONVEX_URL;

export default function SignalsDashboard() {
  const { isAdmin } = useAuthStore();

  if (!isAdmin) {
    return (
      <div className="py-16 text-center">
        <div className="font-mono text-xs text-bone-muted">
          Signals dashboard requires admin access
        </div>
      </div>
    );
  }

  if (!CONVEX_AVAILABLE) {
    return (
      <div className="py-16 text-center">
        <div className="font-mono text-[10px] text-bone-ghost">
          Signals dashboard unavailable
        </div>
        <div className="mt-1 font-mono text-[8px] text-bone-ghost">
          Set NEXT_PUBLIC_CONVEX_URL to enable
        </div>
      </div>
    );
  }

  return <SignalsDashboardInner />;
}

function SignalsDashboardInner() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-[9px] text-bone-muted uppercase tracking-widest mb-3">
          Signals
        </h2>
        <div className="border border-void-border bg-void-base p-8 text-center">
          <div className="font-mono text-xs text-bone-muted">
            No signals yet
          </div>
          <div className="mt-2 font-mono text-[10px] text-bone-ghost max-w-sm mx-auto">
            Create an API key with <code className="text-cyan-base">write:signals</code> scope to start receiving signals from your apps.
          </div>
        </div>
      </div>
    </div>
  );
}
