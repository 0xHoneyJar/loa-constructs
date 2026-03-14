'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthNav } from './auth-nav';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-10 h-10 text-bone-muted hover:text-bone-base transition-colors"
        aria-label="Toggle menu"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute top-14 left-0 right-0 z-50 border-b border-void-border bg-void-base">
          <nav className="flex flex-col px-4 py-4 gap-4">
            <Link
              href="/explore"
              onClick={() => setOpen(false)}
              className="font-mono text-base uppercase tracking-terminal text-bone-muted hover:text-bone-base transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/constructs"
              onClick={() => setOpen(false)}
              className="font-mono text-base uppercase tracking-terminal text-bone-muted hover:text-bone-base transition-colors"
            >
              Catalog
            </Link>
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="font-mono text-base uppercase tracking-terminal text-bone-muted hover:text-bone-base transition-colors"
            >
              What
            </Link>
            <div className="border-t border-void-border pt-4">
              <AuthNav />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
