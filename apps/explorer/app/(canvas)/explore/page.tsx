import { fetchGraphData } from '@/lib/data/fetch-constructs';
import { CanvasExplorer } from '@/components/graph/canvas-explorer';

export const revalidate = 3600;

export const metadata = {
  title: 'Explore — Constructs Network',
  description: 'Interactive canvas visualization of the Constructs Network. Pan, zoom, and discover how constructs compose.',
};

export default async function ExplorePage() {
  const { graphData } = await fetchGraphData();

  return <CanvasExplorer data={graphData} />;
}
