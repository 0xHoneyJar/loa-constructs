'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Toaster } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/?login=required');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-void-base">
        <div className="font-mono text-xs text-bone-muted">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div data-context="dashboard" className="flex h-screen bg-void-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
      {/* @ts-expect-error — React 18/19 JSX type conflict with sonner, works at runtime */}
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: 'var(--color-void-raised)',
            border: '1px solid var(--color-void-border)',
            color: 'var(--color-bone-base)',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: '11px',
            borderRadius: '0px',
          },
        }}
      />
    </div>
  );
}
