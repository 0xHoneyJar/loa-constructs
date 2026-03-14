import { Header } from '@/components/layout/header';
import { GlobalSearch } from '@/components/search/global-search';
import { SigilBackground } from '@/components/logo/sigil-background';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-context="marketing" className="min-h-screen flex flex-col relative">
      {/* Desktop: Loa sigil — CRT burn-in at z-20 (TDR-006, TDR-010) */}
      <div className="hidden lg:block fixed inset-0 opacity-[0.6]" aria-hidden="true">
        <SigilBackground />
      </div>
      <Header />
      <main className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        {children}
      </main>
      <GlobalSearch />
    </div>
  );
}
