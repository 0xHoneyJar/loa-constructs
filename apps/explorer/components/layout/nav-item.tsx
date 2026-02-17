'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface NavItemProps {
  href: string;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
}

export function NavItem({ href, label, shortcut, active = false, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center px-2 py-1 text-sm font-mono no-underline whitespace-nowrap transition-colors',
        active
          ? 'bg-tui-accent/10 text-tui-accent'
          : 'text-tui-fg hover:bg-tui-dim/10',
      )}
    >
      <span className={cn('w-5 inline-block', active ? 'text-tui-accent' : 'text-tui-dim')}>
        {active ? '▸' : ' '}
      </span>
      {label}
      {shortcut && (
        <span className={cn('ml-auto text-xs', active ? 'text-tui-accent' : 'text-tui-dim')}>
          [{shortcut}]
        </span>
      )}
    </Link>
  );
}
