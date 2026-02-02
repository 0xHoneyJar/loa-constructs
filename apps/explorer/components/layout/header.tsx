import Link from 'next/link';
import { SearchInput } from '@/components/search/search-input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-mono text-sm font-semibold uppercase tracking-wider text-white hover:text-domain-docs transition-colors">
          CONSTRUCTS
        </Link>

        <div className="flex items-center gap-4">
          <SearchInput />
          <nav className="flex items-center gap-4">
            <Link
              href="/install"
              className="font-mono text-xs uppercase tracking-wider text-white/60 hover:text-white transition-colors"
            >
              Install
            </Link>
            <Link
              href="/about"
              className="font-mono text-xs uppercase tracking-wider text-white/60 hover:text-white transition-colors"
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
