'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { NavItem } from './nav-item';
import { LogOut } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', shortcut: '1' },
  { name: 'Skills', href: '/skills', shortcut: '2' },
  { name: 'Creator', href: '/creator', shortcut: '3' },
  { name: 'Teams', href: '/teams', shortcut: '4' },
  { name: 'Analytics', href: '/analytics', shortcut: '5' },
  { name: 'API Keys', href: '/api-keys', shortcut: '6' },
];

const tierStyles: Record<string, { label: string; className: string }> = {
  free: { label: 'FREE', className: 'text-tui-dim border-tui-dim' },
  pro: { label: 'PRO', className: 'text-tui-accent border-tui-accent' },
  team: { label: 'TEAM', className: 'text-tui-cyan border-tui-cyan' },
  enterprise: { label: 'ENT', className: 'text-tui-yellow border-tui-yellow' },
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const tier = tierStyles[(user?.role || 'free').toLowerCase()] || tierStyles.free;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.name}
              shortcut={item.shortcut}
              active={isActive}
              onClick={onNavigate}
            />
          );
        })}
      </nav>

      <div className="border-t border-tui-border/50 my-2" />

      <div className="px-2 pb-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-mono text-tui-fg truncate">
            {user?.name || user?.email?.split('@')[0] || 'user'}
          </span>
          <span className={`text-[10px] font-mono border px-1 ${tier.className}`}>
            {tier.label}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-1.5 px-2 py-1 text-xs font-mono text-tui-dim hover:text-tui-red hover:bg-tui-red/10 transition-colors"
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
