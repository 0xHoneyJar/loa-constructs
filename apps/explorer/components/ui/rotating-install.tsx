'use client';

import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/ui/copy-button';

interface RotatingInstallProps {
  slugs: string[];
}

export function RotatingInstall({ slugs }: RotatingInstallProps) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState(slugs[0] ?? 'observer');
  const [phase, setPhase] = useState<'visible' | 'fading' | 'typing'>('visible');

  const currentSlug = slugs[index] ?? 'observer';
  const maxSlugLength = Math.max(...slugs.map((s) => s.length), 20);

  // visible → fading (after 3s hold)
  useEffect(() => {
    if (slugs.length <= 1 || phase !== 'visible') return;
    const t = setTimeout(() => setPhase('fading'), 3000);
    return () => clearTimeout(t);
  }, [phase, slugs.length]);

  // fading → typing (after 400ms fade-out)
  useEffect(() => {
    if (phase !== 'fading') return;
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % slugs.length);
      setDisplayed('');
      setPhase('typing');
    }, 400);
    return () => clearTimeout(t);
  }, [phase, slugs.length]);

  // typing → visible (typewriter, then settle)
  useEffect(() => {
    if (phase !== 'typing') return;
    const target = slugs[index] ?? 'observer';

    if (displayed.length < target.length) {
      const t = setTimeout(() => {
        setDisplayed(target.slice(0, displayed.length + 1));
      }, 60);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setPhase('visible'), 200);
    return () => clearTimeout(t);
  }, [phase, displayed, index, slugs]);

  const installCommand = `npx constructs install ${currentSlug}`;

  return (
    <div className="border border-void-border bg-void-raised px-4 sm:px-6 py-3.5 font-mono text-sm sm:text-lg inline-flex items-center gap-3 max-w-full overflow-x-auto">
      <div className="whitespace-nowrap">
        <span className="text-bone-ghost">$ </span>
        <span className="text-cyan-base">npx constructs install </span>
        <span
          className="inline-block text-left"
          style={{ width: `${maxSlugLength}ch` }}
        >
          <span
            className={`text-bone-base transition-opacity duration-300 ${
              phase === 'fading' ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {displayed}
          </span>
          {phase === 'typing' && (
            <span className="text-cyan-base animate-pulse">_</span>
          )}
        </span>
      </div>
      <CopyButton text={installCommand} />
    </div>
  );
}
