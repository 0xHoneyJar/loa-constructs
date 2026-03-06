import { fetchGraphData } from '@/lib/data/fetch-constructs';
import { GraphExplorer } from '@/components/graph/graph-explorer';
import { CategoryInitializer } from '@/components/graph/category-initializer';

// ISR — revalidate hourly, won't block builds (fetch has error fallback)
export const revalidate = 3600;

export default async function HomePage() {
  const { graphData, categories } = await fetchGraphData();

  return (
    <div className="h-[calc(100vh-120px)]">
      <CategoryInitializer categories={categories} />
      <GraphExplorer data={graphData} />
    </div>
  );
}
