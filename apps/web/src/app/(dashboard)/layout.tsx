/**
 * Dashboard Layout (TUI Style)
 * @see sprint.md T19.5: Update Dashboard Layout Page
 */

'use client';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { TuiLayout } from '@/components/tui/tui-layout';
import { TuiSidebar } from '@/components/dashboard/sidebar';
import { useKeyboardNav } from '@/hooks/use-keyboard-nav';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const routes = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/skills', label: 'Skills' },
  { href: '/packs', label: 'Packs' },
  { href: '/api-keys', label: 'API Keys' },
  { href: '/profile', label: 'Profile' },
  { href: '/billing', label: 'Billing' },
];

const keyHints = [
  { key: '1-6', action: 'nav' },
  { key: 'j/k', action: 'move' },
  { key: 'Enter', action: 'select' },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Map keyboard shortcuts to routes
  const shortcuts: Record<string, string> = {};
  routes.forEach((route, index) => {
    shortcuts[String(index + 1)] = route.href;
  });

  // Get content title based on current route
  const getContentTitle = () => {
    const route = routes.find((r) => pathname === r.href || pathname.startsWith(`${r.href}/`));
    return route?.label || 'Dashboard';
  };

  // Global keyboard navigation for dashboard
  useKeyboardNav({
    itemCount: routes.length,
    shortcuts,
    enabled: true,
  });

  return (
    <ProtectedRoute>
      <TuiLayout
        sidebar={<TuiSidebar />}
        contentTitle={getContentTitle()}
        keyHints={keyHints}
      >
        {children}
      </TuiLayout>
    </ProtectedRoute>
  );
}
