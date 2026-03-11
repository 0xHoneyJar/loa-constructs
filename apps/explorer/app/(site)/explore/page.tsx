import { fetchGraphData } from '@/lib/data/fetch-constructs';
import { GraphExplorer } from '@/components/graph/graph-explorer';

export const revalidate = 3600;

export const metadata = {
  title: 'Explore — Constructs Network',
  description: 'Interactive graph visualization of the Constructs Network. See how constructs compose, depend on each other, and cluster by domain.',
};

export default async function ExplorePage() {
  const { graphData } = await fetchGraphData();

  return (
    <div className="h-[calc(100dvh-3rem)]">
      <GraphExplorer data={graphData} />
    </div>
  );
}
