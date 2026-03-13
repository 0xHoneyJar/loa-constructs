'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type CSSProperties } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  PixelGrid,
  PixelNetwork,
  PixelCube,
  PixelKey,
  PixelSignal,
  PixelPulse,
} from '@/components/icons/pixel';

const baseNavItems = [
  { href: '/dashboard', label: 'Overview', icon: PixelGrid },
  { href: '/dashboard/explore', label: 'Explore', icon: PixelNetwork },
  { href: '/dashboard/constructs', label: 'Constructs', icon: PixelCube },
  { href: '/dashboard/keys', label: 'API Keys', icon: PixelKey },
];

const adminNavItems = [
  { href: '/dashboard/signals', label: 'Signals', icon: PixelSignal },
  { href: '/dashboard/health', label: 'Health', icon: PixelPulse },
];

const SIDEBAR_TOKENS = {
  '--sidebar-bg': 'var(--color-bg-void)',
  '--sidebar-border': 'var(--color-border-subtle)',
  '--sidebar-section-label': 'var(--color-text-ghost)',
  '--sidebar-nav-text': 'var(--color-text-tertiary)',
  '--sidebar-nav-text-hover': 'var(--color-text-primary)',
  '--sidebar-nav-bg-hover': 'var(--color-bg-surface)',
  '--sidebar-nav-active-text': 'var(--color-accent-primary)',
  '--sidebar-nav-active-bg': 'var(--color-cyan-dim-tint-bg)',
  '--sidebar-nav-active-border': 'var(--color-accent-primary)',
  '--sidebar-nav-active-glow': 'inset 0 0 12px var(--color-glow-primary)',
  '--sidebar-disconnect': 'var(--color-text-ghost)',
  '--sidebar-disconnect-hover': 'var(--color-accent-warm)',
} as CSSProperties;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isAdmin } = useAuthStore();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <aside
      style={SIDEBAR_TOKENS}
      className="w-[200px] shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] flex flex-col"
    >
      <div className="p-4 border-b border-[var(--sidebar-border)]">
        <Link href="/" className="font-mono text-[var(--text-xs)] text-[var(--sidebar-nav-text)] uppercase tracking-terminal hover:text-[var(--sidebar-nav-text-hover)] transition-colors">
          constructs.network
        </Link>
      </div>

      <div className="px-3 pt-4 pb-1">
        <span className="font-mono text-[var(--text-2xs)] text-[var(--sidebar-section-label)] uppercase tracking-whisper" aria-hidden="true">
          sector::operations
        </span>
      </div>

      <nav className="flex-1 px-2 space-y-0.5">
        {baseNavItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 font-mono text-[var(--text-sm)] uppercase tracking-wider transition-all ${
                active
                  ? 'text-[var(--sidebar-nav-active-text)] bg-[var(--sidebar-nav-active-bg)] border-l-2 border-[var(--sidebar-nav-active-border)] shadow-[var(--sidebar-nav-active-glow)]'
                  : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] border-l-2 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {isAdmin && (
        <>
          <div className="px-3 pt-3 pb-1 border-t border-[var(--sidebar-border)]">
            <span className="font-mono text-[var(--text-2xs)] text-[var(--sidebar-section-label)] uppercase tracking-whisper" aria-hidden="true">
              sector::admin
            </span>
          </div>
          <nav className="px-2 pb-2 space-y-0.5">
            {adminNavItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 font-mono text-[var(--text-sm)] uppercase tracking-wider transition-all ${
                    active
                      ? 'text-[var(--sidebar-nav-active-text)] bg-[var(--sidebar-nav-active-bg)] border-l-2 border-[var(--sidebar-nav-active-border)] shadow-[var(--sidebar-nav-active-glow)]'
                      : 'text-[var(--sidebar-nav-text)] hover:text-[var(--sidebar-nav-text-hover)] hover:bg-[var(--sidebar-nav-bg-hover)] border-l-2 border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}

      <div className="p-2 border-t border-[var(--sidebar-border)]">
        <Button
          variant="ghost"
          onClick={async () => { await logout(); router.replace('/'); }}
          className="w-full justify-start px-3 py-1.5 font-mono text-[var(--text-sm)] text-[var(--sidebar-disconnect)] hover:text-[var(--sidebar-disconnect-hover)] uppercase tracking-wider"
        >
          Disconnect
        </Button>
      </div>
    </aside>
  );
}
