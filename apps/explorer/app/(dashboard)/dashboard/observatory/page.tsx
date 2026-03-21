'use client';

import { useAuthStore } from '@/lib/stores/auth-store';
import { ObservatoryShell } from '@/components/dashboard/observatory/observatory-shell';

const CONVEX_AVAILABLE = !!process.env.NEXT_PUBLIC_CONVEX_URL;

export default function ObservatoryDashboard() {
  const { isAdmin } = useAuthStore();

  if (!isAdmin) {
    return (
      <div className="py-16 text-center">
        <div className="font-mono text-xs text-bone-muted">
          Observatory requires admin access
        </div>
      </div>
    );
  }

  if (!CONVEX_AVAILABLE) {
    return (
      <div className="py-16 text-center">
        <div className="font-mono text-[10px] text-bone-ghost">
          Observatory unavailable
        </div>
        <div className="mt-1 font-mono text-[8px] text-bone-ghost">
          Set NEXT_PUBLIC_CONVEX_URL to enable
        </div>
      </div>
    );
  }

  return <ObservatoryShell />;
}
