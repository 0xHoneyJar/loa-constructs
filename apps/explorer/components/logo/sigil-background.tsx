'use client';

import dynamic from 'next/dynamic';

/**
 * Full-bleed background sigil particle system.
 * Renders the Loa horse-mark as floating, slowly rotating particles.
 * Neo Tokyo aesthetic: cyan core, crimson fringe, additive glow, scanlines.
 *
 * Desktop only — hidden on mobile for performance.
 */
export const SigilBackground = dynamic(
  () => import('./sigil-scene').then((mod) => mod),
  { ssr: false },
);
