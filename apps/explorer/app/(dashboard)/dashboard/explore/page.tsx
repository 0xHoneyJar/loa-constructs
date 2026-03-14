import { fetchGraphData } from '@/lib/data/fetch-constructs';
import { CanvasExplorer } from '@/components/graph/canvas-explorer';

export const revalidate = 3600;

export default async function DashboardExplorePage() {
  const { graphData } = await fetchGraphData();

  return (
    <div className="h-[calc(100vh-7rem)]">
      <CanvasExplorer data={graphData} />
    </div>
  );
}
