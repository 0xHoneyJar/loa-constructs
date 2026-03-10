import { fetchGraphData } from '@/lib/data/fetch-constructs';
import { GraphExplorer } from '@/components/graph/graph-explorer';

export const revalidate = 3600;

export default async function DashboardExplorePage() {
  const { graphData } = await fetchGraphData();

  return (
    <div className="h-[calc(100vh-7rem)]">
      <GraphExplorer data={graphData} />
    </div>
  );
}
