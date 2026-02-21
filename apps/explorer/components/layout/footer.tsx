import { Suspense } from 'react';
import { fetchGraphData } from '@/lib/data/fetch-constructs';

async function FooterStats() {
  const { graphData } = await fetchGraphData();
  const { totalConstructs, totalCommands } = graphData.meta;
  const categoryCount = graphData.categories.length;

  return (
    <p className="font-mono text-xs uppercase tracking-wider text-white/40">
      {totalConstructs} CONSTRUCTS · {totalCommands} COMMANDS · {categoryCount} CATEGORIES
    </p>
  );
}

function FooterFallback() {
  return (
    <p className="font-mono text-xs uppercase tracking-wider text-white/40">
      CONSTRUCTS NETWORK
    </p>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-center px-4">
        <Suspense fallback={<FooterFallback />}>
          <FooterStats />
        </Suspense>
      </div>
    </footer>
  );
}
