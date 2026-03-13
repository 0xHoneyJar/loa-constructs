import { Suspense } from 'react';
import { fetchAllConstructs } from '@/lib/data/fetch-constructs';
import { ConstructCatalog } from '@/components/constructs/construct-catalog';

export const revalidate = 3600; // ISR: revalidate every hour

export const metadata = {
  title: 'Constructs',
  description: 'Browse AI agent constructs — named expertise you install into your coding agent.',
};

export default async function ConstructsCatalogPage() {
  const allConstructs = await fetchAllConstructs();

  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <ConstructCatalog constructs={allConstructs} />
    </Suspense>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-10 w-64 bg-void-raised animate-pulse" />
          <div className="h-5 w-40 bg-void-raised animate-pulse mt-2" />
        </div>
        <div className="h-10 w-48 bg-void-raised animate-pulse" />
      </div>
      <div className="grid grid-cols-5 gap-px bg-void-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-void-base p-4 h-16 animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-void-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-void-base p-5 h-40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
