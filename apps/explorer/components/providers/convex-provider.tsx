'use client';

import { ConvexProvider as ConvexClientProvider, ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

if (!convex && typeof window !== 'undefined') {
  console.warn(
    '[constructs] Convex not configured — real-time features disabled. Set NEXT_PUBLIC_CONVEX_URL to enable.',
  );
}

export function ConvexProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return <>{children}</>;
  }
  return (
    <ConvexClientProvider client={convex}>{children}</ConvexClientProvider>
  );
}
