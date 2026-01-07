/**
 * Dashboard Sidebar Component (TUI Style)
 * @see sprint.md T19.3: Redesign Dashboard Sidebar
 */

'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { TuiNavItem } from '@/components/tui/tui-nav-item';
import { LogOut } from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard', shortcut: '1' },
  { name: 'Skills', href: '/skills', shortcut: '2' },
  { name: 'Packs', href: '/packs', shortcut: '3' },
  { name: 'Creator', href: '/creator', shortcut: '4' },
  { name: 'API Keys', href: '/api-keys', shortcut: '5' },
  { name: 'Profile', href: '/profile', shortcut: '6' },
  { name: 'Billing', href: '/billing', shortcut: '7' },
];

interface TuiSidebarProps {
  className?: string;
}

/**
 * TUI-styled sidebar navigation
 * Keyboard shortcuts: 1-6 for navigation, j/k for up/down
 */
export function TuiSidebar({ className }: TuiSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getTierBadge = (role: string) => {
    const tierMap: Record<string, { label: string; color: string }> = {
      free: { label: 'FREE', color: 'var(--fg-dim)' },
      pro: { label: 'PRO', color: 'var(--accent)' },
      team: { label: 'TEAM', color: 'var(--cyan)' },
      enterprise: { label: 'ENT', color: 'var(--yellow)' },
    };
    return tierMap[role.toLowerCase()] || tierMap.free;
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const tier = getTierBadge(user?.role || 'free');

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <TuiNavItem
              key={item.href}
              href={item.href}
              label={item.name}
              shortcut={item.shortcut}
              active={isActive}
            />
          );
        })}
      </nav>

      {/* Divider */}
      <div style={{
        borderTop: '1px solid var(--border)',
        margin: '8px 0',
        opacity: 0.5
      }} />

      {/* User Section */}
      <div style={{ padding: '4px 8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <span style={{ color: 'var(--fg)' }}>
            {user?.name || user?.email?.split('@')[0] || 'user'}
          </span>
          <span style={{
            color: tier.color,
            fontSize: '10px',
            padding: '1px 4px',
            border: `1px solid ${tier.color}`,
          }}>
            {tier.label}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            width: '100%',
            padding: '4px 8px',
            background: 'none',
            border: 'none',
            color: 'var(--fg-dim)',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '12px',
          }}
          className="hover:text-[var(--red)] hover:bg-[rgba(255,95,95,0.1)]"
        >
          <LogOut size={12} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// Export as Sidebar for backward compatibility
export { TuiSidebar as Sidebar };

// Mobile sidebar is now handled by TuiLayout
export function MobileSidebar() {
  // Deprecated - mobile handled by TuiLayout
  return null;
}

export default TuiSidebar;
