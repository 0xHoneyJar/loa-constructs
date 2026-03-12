'use client';

import { useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { SignalStatusBar } from '@/components/dashboard/signals/signal-status-bar';
import { SignalInbox } from '@/components/dashboard/signals/signal-inbox';
import { SignalActivityFeed } from '@/components/dashboard/signals/signal-activity-feed';

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
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedApp = searchParams.get('app');
  const selectedSignalId = searchParams.get('id');

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      router.replace(`/dashboard/signals?${params.toString()}`);
    },
    [searchParams, router],
  );

  const handleSelectApp = useCallback(
    (app: string | null) => {
      updateParams({ app, id: null });
    },
    [updateParams],
  );

  const handleSelectSignal = useCallback(
    (id: string | null) => {
      updateParams({ id });
    },
    [updateParams],
  );

  const handleUpdateStatus = useCallback(
    async (signalId: string, status: string, note?: string) => {
      const writeKey = process.env.NEXT_PUBLIC_CONVEX_WRITE_KEY;
      if (!writeKey) return;

      try {
        const { getConvexClient } = await import('@/lib/convex/server');
        const convex = getConvexClient();
        if (!convex) return;

        const { api } = await import('@/convex/_generated/api');
        await convex.action(api.signals.updateStatusFromDashboard, {
          writeKey,
          signalId: signalId as never,
          status,
          resolutionNote: note,
        });
      } catch (err) {
        console.error('Failed to update signal status:', err);
      }
    },
    [],
  );

  const handleEscalate = useCallback(
    async (signalId: string) => {
      const writeKey = process.env.NEXT_PUBLIC_CONVEX_WRITE_KEY;
      if (!writeKey) return;

      try {
        const { getConvexClient } = await import('@/lib/convex/server');
        const convex = getConvexClient();
        if (!convex) return;

        const { api } = await import('@/convex/_generated/api');
        await convex.action(api.signals.escalate, {
          writeKey,
          signalId: signalId as never,
        });
      } catch (err) {
        console.error('Failed to escalate signal:', err);
      }
    },
    [],
  );

  return (
    <div className="space-y-4">
      {/* Zone A: Status Bar */}
      <div>
        <h2 className="font-mono text-[9px] text-bone-muted uppercase tracking-widest mb-2">
          Signals
        </h2>
        <SignalStatusBar
          selectedApp={selectedApp}
          onSelectApp={handleSelectApp}
        />
      </div>

      {/* Zone B: Triage Inbox */}
      <SignalInbox
        selectedApp={selectedApp}
        selectedSignalId={selectedSignalId}
        onSelectSignal={handleSelectSignal}
        onUpdateStatus={handleUpdateStatus}
        onEscalate={handleEscalate}
      />

      {/* Zone C: Activity Feed */}
      <SignalActivityFeed />
    </div>
  );
}
