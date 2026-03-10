'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/explore', label: 'Explore' },
  { href: '/dashboard/constructs', label: 'Constructs' },
  { href: '/dashboard/keys', label: 'API Keys' },
];

const adminItems = [
  { href: '/dashboard/analytics', label: 'Analytics' },
];

export function Sidebar() {
  const { isAdmin } = useAuthStore();
  const pathname = usePathname();

  return (
    <aside className="w-[200px] shrink-0 border-r border-bone-light/10 bg-void-base flex flex-col">
      <div className="p-4 border-b border-bone-light/10">
        <Link href="/" className="font-mono text-xs text-bone-light/70 hover:text-bone-light transition-colors">
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
                  ? 'text-cyan-base bg-cyan-base/5 border-l-2 border-cyan-base'
                  : 'text-bone-light/50 hover:text-bone-light/80 hover:bg-bone-light/5 border-l-2 border-transparent'
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-3 border-t border-bone-light/10" />
            <div className="px-3 py-1 font-mono text-[9px] text-bone-light/30 uppercase tracking-widest">
              Admin
            </div>
            {adminItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'text-cyan-base bg-cyan-base/5 border-l-2 border-cyan-base'
                      : 'text-bone-light/50 hover:text-bone-light/80 hover:bg-bone-light/5 border-l-2 border-transparent'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </aside>
  );
}
