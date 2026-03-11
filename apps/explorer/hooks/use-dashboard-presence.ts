'use client';

import { useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/lib/stores/auth-store';

const CONVEX_AVAILABLE = !!process.env.NEXT_PUBLIC_CONVEX_URL;
const HEARTBEAT_INTERVAL_MS = 30_000;

export function useDashboardPresence() {
  if (!CONVEX_AVAILABLE) {
    return { online: [] };
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return usePresenceInner();
}

function usePresenceInner() {
  const heartbeat = useMutation(api.dashboardPresence.upsert);
  const online = useQuery(api.dashboardPresence.listOnline);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.walletAddress) return;

    const sendHeartbeat = () => {
      heartbeat({
        wallet: user.walletAddress!,
        displayName: user.name ?? undefined,
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user?.walletAddress, user?.name, heartbeat]);

  return { online: online ?? [] };
}
