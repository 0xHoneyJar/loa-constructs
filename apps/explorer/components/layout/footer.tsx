'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.constructs.network/v1';

interface FooterStatsData {
  totalConstructs: number;
  totalCommands: number;
  categoryCount: number;
}

function FooterStats() {
  const [stats, setStats] = useState<FooterStatsData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const [summaryRes, categoriesRes] = await Promise.all([
          fetch(`${API_BASE}/constructs/summary`),
          fetch(`${API_BASE}/categories`),
        ]);

        if (cancelled) return;
        if (!summaryRes.ok || !categoriesRes.ok) return;

        const summaryData = await summaryRes.json();
        const categoriesData = await categoriesRes.json();

        if (cancelled) return;

        const totalCommands = Array.isArray(summaryData.constructs)
          ? summaryData.constructs.reduce(
              (sum: number, c: { commands?: string[] }) =>
                sum + (c.commands?.length ?? 0),
              0,
            )
          : 0;

        const categories = Array.isArray(categoriesData?.data)
          ? categoriesData.data
          : Array.isArray(categoriesData)
            ? categoriesData
            : [];

        setStats({
          totalConstructs: summaryData.total ?? 0,
          totalCommands,
          categoryCount: categories.length,
        });
      } catch {
        // Silently fail — fallback text remains visible
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) {
    return (
      <p className="font-mono text-xs uppercase tracking-widest text-bone-ghost">
        Constructs Network
      </p>
    );
  }

  return (
    <p className="font-mono text-xs uppercase tracking-widest text-bone-ghost">
      {stats.totalConstructs} Constructs · {stats.totalCommands} Commands ·{' '}
      {stats.categoryCount} Categories
    </p>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-void-border">
      <div className="mx-auto flex flex-col items-start gap-3 max-w-6xl px-4 py-6">
        <div
          className="h-5 sm:h-6"
          style={{
            maskImage: 'url(/logo-bone.svg)',
            WebkitMaskImage: 'url(/logo-bone.svg)',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            aspectRatio: '455 / 155',
            backgroundColor: 'var(--color-bone-ghost)',
          }}
          role="img"
          aria-label="Loa"
        />
        <FooterStats />
        <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-terminal text-bone-ghost">
          <Link href="/terms" className="hover:text-bone-dim transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-bone-dim transition-colors">Privacy</Link>
          <a href="https://github.com/0xHoneyJar/loa-constructs" target="_blank" rel="noopener noreferrer" className="hover:text-bone-dim transition-colors">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
