import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { GlobalSearch } from '@/components/search/global-search';
import { SigilBackground } from '@/components/logo/sigil-background';
import { KaironicReveal } from '@/components/ui/kaironic-reveal';

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KaironicReveal minDuration={800}>
      <div data-context="site" className="flex min-h-screen flex-col relative">
        {/* Desktop: void + horse. nothing else. */}
        <div className="hidden lg:block fixed inset-0" aria-hidden="true">
          <SigilBackground />
        </div>
        <Header />
        <main className="relative z-10 flex-1">{children}</main>
        <Footer />
        <GlobalSearch />
      </div>
    </KaironicReveal>
  );
}
