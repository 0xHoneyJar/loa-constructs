import { GlobalSearch } from '@/components/search/global-search';

export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <GlobalSearch />
    </>
  );
}
