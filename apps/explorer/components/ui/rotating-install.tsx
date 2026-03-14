'use client';

import { useEffect, useState } from 'react';

interface RotatingInstallProps {
  slugs: string[];
}

export function RotatingInstall({ slugs }: RotatingInstallProps) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState(slugs[0] ?? 'observer');
  const [phase, setPhase] = useState<'visible' | 'fading' | 'typing'>('visible');
  const [copied, setCopied] = useState(false);

  const currentSlug = slugs[index] ?? 'observer';
  const maxSlugLength = Math.max(...slugs.map((s) => s.length), 20);
  const installCommand = `npx constructs install ${currentSlug}`;

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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="w-full border border-void-border px-5 py-4 font-mono text-sm sm:text-lg flex items-center justify-between gap-3 cursor-pointer hover:border-bone-ghost transition-colors group text-left"
      aria-label={copied ? 'Copied to clipboard' : 'Click to copy install command'}
    >
      <div className="whitespace-nowrap overflow-x-auto">
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
      <span className="text-bone-ghost group-hover:text-bone-dim transition-colors shrink-0 text-xs font-mono uppercase tracking-terminal">
        {copied ? 'Copied' : 'Copy'}
      </span>
    </button>
  );
}
