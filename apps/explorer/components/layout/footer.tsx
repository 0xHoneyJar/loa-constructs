'use client';

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

        setStats({
          totalConstructs: summaryData.total ?? 0,
          totalCommands,
          categoryCount: Array.isArray(categoriesData)
            ? categoriesData.length
            : 0,
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
      <p className="font-mono text-xs uppercase tracking-wider text-white/40">
        CONSTRUCTS NETWORK
      </p>
    );
  }

  return (
    <p className="font-mono text-xs uppercase tracking-wider text-white/40">
      {stats.totalConstructs} CONSTRUCTS · {stats.totalCommands} COMMANDS ·{' '}
      {stats.categoryCount} CATEGORIES
    </p>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-center px-4">
        <FooterStats />
      </div>
    </footer>
  );
}
