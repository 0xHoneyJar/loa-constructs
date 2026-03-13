'use client';

import { cn } from '@/lib/utils/cn';
import { type CSSProperties, type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  variant?: 'default' | 'cyan' | 'green' | 'yellow';
}

const STAT_CARD_TOKENS = {
  '--stat-card-bg': 'var(--color-bg-panel)',
  '--stat-card-border': 'var(--color-border-subtle)',
  '--stat-card-border-hover': 'var(--color-border-active)',
  '--stat-card-hover-glow': 'var(--elevation-2)',
  '--stat-card-padding': 'var(--space-400)',
  '--stat-card-gap': 'var(--space-150)',
  '--stat-card-label': 'var(--color-text-tertiary)',
  '--stat-card-value': 'var(--color-text-primary)',
} as CSSProperties;

const variantValueColors: Record<string, string> = {
  default: 'var(--color-text-primary)',
  cyan: 'var(--color-accent-primary)',
  green: 'var(--color-status-success)',
  yellow: 'var(--color-status-warning)',
};

export function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const isLoading = value === '...';

  return (
    <div
      style={STAT_CARD_TOKENS}
      className="border border-[var(--stat-card-border)] bg-[var(--stat-card-bg)] p-[var(--stat-card-padding)] hover:border-[var(--stat-card-border-hover)] hover:shadow-[var(--stat-card-hover-glow)] transition-colors"
    >
      <div className="flex items-center gap-[var(--stat-card-gap)]">
        {icon && (
          <span className="w-3.5 h-3.5 text-[var(--color-text-ghost)]" aria-hidden="true">
            {icon}
          </span>
        )}
        <span
          className="font-mono text-[var(--text-xs)] text-[var(--stat-card-label)] uppercase tracking-terminal"
          aria-hidden="true"
        >
          {label}
        </span>
      </div>
      {isLoading ? (
        <div
          className="mt-[var(--stat-card-gap)] h-7 w-10 bg-[var(--color-bg-surface)] animate-pulse"
          aria-label={`Loading ${label}`}
          role="status"
        />
      ) : (
        <div
          className={cn('mt-[var(--stat-card-gap)] font-mono text-[var(--text-xl)]')}
          style={{ color: variantValueColors[variant] }}
          aria-label={`${label}: ${value}`}
        >
          {value}
        </div>
      )}
    </div>
  );
}
