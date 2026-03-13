'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';

interface QuickLinkProps {
  href: string;
  label: string;
  icon?: ReactNode;
}

export function QuickLink({ href, label, icon }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="border border-sprawl-grid-line bg-sprawl-surface-panel p-4 hover:border-sprawl-glow-cyan hover:shadow-[0_0_8px_var(--color-glow-cyan)] transition-all group"
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className="w-3.5 h-3.5 text-bone-ghost group-hover:text-cyan-dim" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="font-mono text-[11px] text-bone-dim group-hover:text-bone-base uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="mt-1 font-mono text-[9px] text-bone-ghost group-hover:text-cyan-dim" aria-hidden="true">
        &rarr;
      </div>
    </Link>
  );
}
