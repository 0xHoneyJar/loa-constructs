'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isAdmin } = useAuthStore();

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  return (
    <aside className="w-[200px] shrink-0 border-r border-sprawl-grid-line bg-void-base flex flex-col">
      <div className="p-4 border-b border-sprawl-grid-line">
        <Link href="/" className="font-mono text-[9px] text-bone-muted uppercase tracking-terminal hover:text-bone-base transition-colors">
          constructs.network
        </Link>
      </div>

      <div className="px-3 pt-4 pb-1">
        <span className="font-mono text-[8px] text-bone-ghost uppercase tracking-whisper" aria-hidden="true">
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
              className={`flex items-center gap-2.5 px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-all ${
                active
                  ? 'text-cyan-base bg-cyan-dim/10 border-l-2 border-cyan-base shadow-[inset_0_0_12px_var(--color-glow-cyan)]'
                  : 'text-bone-muted hover:text-bone-base hover:bg-void-raised border-l-2 border-transparent'
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
          <div className="px-3 pt-3 pb-1 border-t border-sprawl-grid-line">
            <span className="font-mono text-[8px] text-bone-ghost uppercase tracking-whisper" aria-hidden="true">
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
                  className={`flex items-center gap-2.5 px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-all ${
                    active
                      ? 'text-cyan-base bg-cyan-dim/10 border-l-2 border-cyan-base shadow-[inset_0_0_12px_var(--color-glow-cyan)]'
                      : 'text-bone-muted hover:text-bone-base hover:bg-void-raised border-l-2 border-transparent'
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

      <div className="p-2 border-t border-sprawl-grid-line">
        <Button
          variant="ghost"
          onClick={async () => { await logout(); router.replace('/'); }}
          className="w-full justify-start px-3 py-1.5 font-mono text-[11px] text-bone-ghost hover:text-crimson-base uppercase tracking-wider"
        >
          Disconnect
        </Button>
      </div>
    </aside>
  );
}
