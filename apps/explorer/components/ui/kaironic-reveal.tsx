'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LoadingSigil } from '@/components/logo/loading-sigil';

/**
 * Kaironic Reveal — enforces a minimum pause before showing content.
 *
 * "Empty space is design. The best games have room to breathe and process."
 * — The Arcade, principle 5
 *
 * The loading moment is intentional. It creates space between pages
 * for the brain to shift context. The mark powers on, holds, then
 * the content fades in. Minimum 800ms (≈10 SprawlOS quanta).
 */
export function KaironicReveal({
  children,
  minDuration = 800,
}: {
  children: ReactNode;
  minDuration?: number;
}) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReady(true);
      // Fade in after the hold
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration]);

  if (!ready) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[--color-void-base]">
        {/* Vignette */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(
              ellipse 60% 55% at 50% 48%,
              transparent 0%,
              oklch(0.04 0.003 250 / 0.4) 60%,
              oklch(0.03 0.002 250 / 0.8) 100%
            )`,
          }}
        />

        {/* Data substrate grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(0deg, oklch(0.10 0.008 195 / 0.08) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.10 0.008 195 / 0.08) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            maskImage: `radial-gradient(ellipse 50% 50% at 50% 48%, black 0%, transparent 70%)`,
            WebkitMaskImage: `radial-gradient(ellipse 50% 50% at 50% 48%, black 0%, transparent 70%)`,
          }}
        />

        {/* The mark */}
        <div className="relative flex flex-col items-center gap-6">
          <LoadingSigil size={280} />
          <p
            className="font-mono uppercase"
            style={{
              fontSize: '0.5625rem',
              letterSpacing: '0.25em',
              color: 'oklch(0.28 0.03 195)',
            }}
          >
            Loading
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 332ms steps(4)',
      }}
    >
      {children}
    </div>
  );
}
