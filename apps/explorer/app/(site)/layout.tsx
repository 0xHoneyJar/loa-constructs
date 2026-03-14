import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { GlobalSearch } from '@/components/search/global-search';
import { SigilBackground } from '@/components/logo/sigil-background';

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-context="site" className="flex min-h-screen flex-col relative">
      {/* Desktop: Loa sigil — CRT burn-in at z-20 (TDR-006, TDR-010) */}
      <div className="hidden lg:block fixed inset-0 opacity-[0.6]" aria-hidden="true">
        <SigilBackground />
      </div>
      <Header />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
      <GlobalSearch />
    </div>
  );
}
