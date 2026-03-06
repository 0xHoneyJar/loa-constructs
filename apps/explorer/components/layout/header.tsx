import Link from 'next/link';
import { SearchInput } from '@/components/search/search-input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-void-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-mono text-sm font-semibold uppercase tracking-terminal text-bone-base hover:text-cyan-base transition-colors">
          CONSTRUCTS
        </Link>

        <div className="flex items-center gap-4">
          <SearchInput />
          <nav className="flex items-center gap-4">
            <Link
              href="/constructs"
              className="font-mono text-xs uppercase tracking-terminal text-bone-dim hover:text-bone-base transition-colors"
            >
              Constructs
            </Link>
            <Link
              href="/install"
              className="font-mono text-xs uppercase tracking-terminal text-bone-dim hover:text-bone-base transition-colors"
            >
              Install
            </Link>
            <Link
              href="/about"
              className="font-mono text-xs uppercase tracking-terminal text-bone-dim hover:text-bone-base transition-colors"
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
