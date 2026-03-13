import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { GlobalSearch } from '@/components/search/global-search';

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-context="site" className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <GlobalSearch />
    </div>
  );
}
