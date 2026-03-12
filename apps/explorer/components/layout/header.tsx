import Link from 'next/link';
import { AuthNav } from './auth-nav';
import { MobileNav } from './mobile-nav';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-void-border bg-void-base">
      <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-lg sm:text-xl uppercase tracking-display text-bone-base hover:text-cyan-base transition-colors">
          Constructs
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-7">
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
          <AuthNav />
        </nav>

        {/* Mobile nav */}
        <MobileNav />
      </div>
    </header>
  );
}
