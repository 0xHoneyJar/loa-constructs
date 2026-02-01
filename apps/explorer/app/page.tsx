import { fetchGraphData } from '@/lib/data/fetch-constructs';
import { GraphExplorer } from '@/components/graph/graph-explorer';

export default async function HomePage() {
  const graphData = await fetchGraphData();

  return (
    <div className="h-[calc(100vh-120px)]">
      <GraphExplorer data={graphData} />
    </div>
  );
}
