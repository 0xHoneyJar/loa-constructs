'use client';

import Link from 'next/link';
import { type CSSProperties, type ReactNode } from 'react';

interface QuickLinkProps {
  href: string;
  label: string;
  icon?: ReactNode;
}

const QUICK_LINK_TOKENS = {
  '--quick-link-bg': 'var(--color-bg-panel)',
  '--quick-link-border': 'var(--color-border-subtle)',
  '--quick-link-border-hover': 'var(--color-border-active)',
  '--quick-link-hover-glow': 'var(--elevation-2)',
  '--quick-link-icon': 'var(--color-text-ghost)',
  '--quick-link-icon-hover': 'var(--color-accent-primary-dim)',
  '--quick-link-label': 'var(--color-text-secondary)',
  '--quick-link-label-hover': 'var(--color-text-primary)',
  '--quick-link-padding': 'var(--space-400)',
  '--quick-link-gap': 'var(--space-200)',
} as CSSProperties;

export function QuickLink({ href, label, icon }: QuickLinkProps) {
  return (
    <Link
      href={href}
      style={QUICK_LINK_TOKENS}
      className="border border-[var(--quick-link-border)] bg-[var(--quick-link-bg)] p-[var(--quick-link-padding)] hover:border-[var(--quick-link-border-hover)] hover:shadow-[var(--quick-link-hover-glow)] transition-all group"
    >
      <div className="flex items-center gap-[var(--quick-link-gap)]">
        {icon && (
          <span className="w-3.5 h-3.5 text-[var(--quick-link-icon)] group-hover:text-[var(--quick-link-icon-hover)]" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="font-mono text-[var(--text-sm)] text-[var(--quick-link-label)] group-hover:text-[var(--quick-link-label-hover)] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="mt-1 font-mono text-[var(--text-2xs)] text-[var(--quick-link-icon)] group-hover:text-[var(--quick-link-icon-hover)]" aria-hidden="true">
        &rarr;
      </div>
    </Link>
  );
}
