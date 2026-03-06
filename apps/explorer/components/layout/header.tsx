import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-void-border bg-void-base/90 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-base uppercase tracking-display text-bone-base hover:text-cyan-base transition-colors">
          Constructs
        </Link>

        <nav className="flex items-center gap-5">
          <Link
            href="/about"
            className="font-mono text-[11px] text-bone-muted hover:text-bone-base transition-colors"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
