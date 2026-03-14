import { Header } from '@/components/layout/header';
import { GlobalSearch } from '@/components/search/global-search';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-context="marketing" className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        {children}
      </main>
      <GlobalSearch />
    </div>
  );
}
