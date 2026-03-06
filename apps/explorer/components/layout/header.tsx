import Link from 'next/link';
import { SearchTrigger } from '@/components/search/search-trigger';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-void-border bg-void-base/90 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-sm uppercase tracking-display text-bone-base hover:text-cyan-base transition-colors">
          CONSTRUCTS
        </Link>

        <div className="flex items-center gap-5">
          <nav className="hidden sm:flex items-center gap-5">
            <Link
              href="/constructs"
              className="font-mono text-[11px] uppercase tracking-terminal text-bone-muted hover:text-bone-base transition-colors"
            >
              Browse
            </Link>
            <Link
              href="/install"
              className="font-mono text-[11px] uppercase tracking-terminal text-bone-muted hover:text-bone-base transition-colors"
            >
              Install
            </Link>
            <Link
              href="/about"
              className="font-mono text-[11px] uppercase tracking-terminal text-bone-muted hover:text-bone-base transition-colors"
            >
              About
            </Link>
          </nav>
          <SearchTrigger />
        </div>
      </div>
    </header>
  );
}
