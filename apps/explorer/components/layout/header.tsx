import Link from 'next/link';
import { AuthNav } from './auth-nav';
import { SearchTrigger } from './search-trigger';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-void-border bg-void-base/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-xl uppercase tracking-display text-bone-base hover:text-cyan-base transition-colors">
          Constructs
        </Link>

        <nav className="flex items-center gap-7">
          <Link
            href="/explore"
            className="font-mono text-base text-bone-muted hover:text-bone-base transition-colors"
          >
            Explore
          </Link>
          <Link
            href="/constructs"
            className="font-mono text-base text-bone-muted hover:text-bone-base transition-colors"
          >
            Catalog
          </Link>
          <Link
            href="/about"
            className="font-mono text-base text-bone-muted hover:text-bone-base transition-colors"
          >
            About
          </Link>
          <SearchTrigger />
          <AuthNav />
        </nav>
      </div>
    </header>
  );
}
