'use client';

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/api/query-client';
import { AuthInitializer } from '@/components/auth/auth-initializer';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        <DashboardShell>{children}</DashboardShell>
      </AuthInitializer>
    </QueryClientProvider>
  );
}
