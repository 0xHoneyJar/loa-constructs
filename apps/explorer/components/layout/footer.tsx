import { fetchGraphData } from '@/lib/data/fetch-constructs';

export async function Footer() {
  const { graphData } = await fetchGraphData();
  const { totalConstructs, totalCommands } = graphData.meta;
  const categoryCount = graphData.categories.length;

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-center px-4">
        <p className="font-mono text-xs uppercase tracking-wider text-white/40">
          {totalConstructs} CONSTRUCTS · {totalCommands} COMMANDS · {categoryCount} CATEGORIES
        </p>
      </div>
    </footer>
  );
}
