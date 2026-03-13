'use client';

import { type CSSProperties, useCallback, useState } from 'react';

type Density = 'comfortable' | 'compact';

const DENSITY_COOKIE = 'sprawl-density';

function getDensity(): Density {
  if (typeof document === 'undefined') return 'comfortable';
  const match = document.cookie.match(new RegExp(`${DENSITY_COOKIE}=([^;]+)`));
  return (match?.[1] as Density) ?? 'comfortable';
}

function setDensityCookie(density: Density) {
  document.cookie = `${DENSITY_COOKIE}=${density};path=/;max-age=31536000;SameSite=Lax`;
}

const TOGGLE_TOKENS = {
  '--toggle-text': 'var(--color-text-ghost)',
  '--toggle-text-active': 'var(--color-accent-primary)',
  '--toggle-border': 'var(--color-border-subtle)',
} as CSSProperties;

export function DensityToggle() {
  const [density, setDensity] = useState<Density>(getDensity);

  const toggle = useCallback(() => {
    const next: Density = density === 'comfortable' ? 'compact' : 'comfortable';
    setDensity(next);
    setDensityCookie(next);

    const ctx = document.querySelector('[data-context]');
    if (ctx) {
      ctx.setAttribute('data-density', next);
    }
  }, [density]);

  return (
    <button
      type="button"
      onClick={toggle}
      style={TOGGLE_TOKENS}
      className="font-mono text-[var(--text-2xs)] text-[var(--toggle-text)] hover:text-[var(--toggle-text-active)] border border-[var(--toggle-border)] px-1.5 py-0.5 uppercase tracking-whisper transition-colors"
      aria-label={`Switch to ${density === 'comfortable' ? 'compact' : 'comfortable'} density`}
    >
      {density === 'comfortable' ? 'compact' : 'comfort'}
    </button>
  );
}
