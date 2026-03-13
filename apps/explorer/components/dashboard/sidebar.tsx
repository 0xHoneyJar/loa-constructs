'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

const baseNavItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/explore', label: 'Explore' },
  { href: '/dashboard/constructs', label: 'Constructs' },
  { href: '/dashboard/keys', label: 'API Keys' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isAdmin } = useAuthStore();

  const navItems = [
    ...baseNavItems,
    ...(isAdmin
      ? [
          { href: '/dashboard/signals', label: 'Signals' },
          { href: '/dashboard/health', label: 'Health' },
        ]
      : []),
  ];

  return (
    <aside className="w-[200px] shrink-0 border-r border-void-border bg-void-base flex flex-col">
      <div className="p-4 border-b border-void-border">
        <Link href="/" className="font-mono text-xs text-bone-dim hover:text-bone-bright transition-colors">
          constructs.network
        </Link>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                isActive
                  ? 'text-cyan-base bg-cyan-dim/10 border-l-2 border-cyan-base'
                  : 'text-bone-muted hover:text-bone-base hover:bg-void-raised border-l-2 border-transparent'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-void-border">
        <button
          onClick={async () => { await logout(); router.replace('/'); }}
          className="w-full text-left px-3 py-1.5 font-mono text-[11px] text-bone-ghost hover:text-crimson-base uppercase tracking-wider transition-colors"
        >
          Disconnect
        </button>
      </div>
    </aside>
  );
}
