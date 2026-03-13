'use client';

import { cn } from '@/lib/utils/cn';
import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  variant?: 'default' | 'cyan' | 'green' | 'yellow';
}

const variantStyles = {
  default: 'text-bone-base',
  cyan: 'text-cyan-base',
  green: 'text-sprawl-node-green',
  yellow: 'text-sprawl-token-yellow',
};

export function StatCard({ label, value, icon, variant = 'default' }: StatCardProps) {
  const isLoading = value === '...';

  return (
    <div className="border border-sprawl-grid-line bg-sprawl-surface-panel p-4 hover:border-sprawl-glow-cyan transition-colors">
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className="w-3.5 h-3.5 text-bone-ghost" aria-hidden="true">
            {icon}
          </span>
        )}
        <span
          className="font-mono text-[9px] text-bone-muted uppercase tracking-terminal"
          aria-hidden="true"
        >
          {label}
        </span>
      </div>
      {isLoading ? (
        <div
          className="mt-1.5 h-7 w-10 bg-void-raised animate-pulse"
          aria-label={`Loading ${label}`}
          role="status"
        />
      ) : (
        <div
          className={cn('mt-1.5 font-mono text-xl', variantStyles[variant])}
          aria-label={`${label}: ${value}`}
        >
          {value}
        </div>
      )}
    </div>
  );
}
