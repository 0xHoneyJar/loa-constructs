import { fetchGraphData } from '@/lib/data/fetch-constructs';
import { GraphExplorer } from '@/components/graph/graph-explorer';
import { CategoryInitializer } from '@/components/graph/category-initializer';

// Force dynamic — homepage fetches live graph data from API,
// must not block build on API availability.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { graphData, categories } = await fetchGraphData();

  return (
    <div className="h-[calc(100vh-120px)]">
      <CategoryInitializer categories={categories} />
      <GraphExplorer data={graphData} />
    </div>
  );
}
