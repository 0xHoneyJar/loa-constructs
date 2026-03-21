'use client';

import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

function renderFavicon(score: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background — void
  ctx.fillStyle = '#131318';
  ctx.fillRect(0, 0, 32, 32);

  // Score circle — color by threshold
  const color =
    score >= 80 ? '#6ee7b7' : // cyan-ish green
    score >= 50 ? '#eab308' : // yellow
    '#ef4444';                // red

  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Score text
  ctx.fillStyle = '#131318';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(score), 16, 17);

  return canvas.toDataURL('image/png');
}

/**
 * Updates the browser favicon to reflect the current health score.
 * Green >= 80, yellow >= 50, red < 50.
 * Restores original favicon on unmount.
 */
export function useHealthFavicon() {
  const health = useQuery(api.healthObservations.current);

  useEffect(() => {
    if (!health) return;

    const link =
      (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ||
      document.createElement('link');
    const originalHref = link.href;

    link.rel = 'icon';
    link.href = renderFavicon(health.healthScore);

    if (!link.parentNode) {
      document.head.appendChild(link);
    }

    return () => {
      // Restore original on unmount
      if (originalHref) {
        link.href = originalHref;
      }
    };
  }, [health?.healthScore]);
}
