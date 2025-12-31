/**
 * Protected Route Component
 * @see sprint.md T5.5: ProtectedRoute component for auth-required pages
 */

'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
  requireEmailVerified?: boolean;
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  requireEmailVerified = false,
  allowedRoles,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requireEmailVerified && user && !user.emailVerified) {
      router.push('/verify-email');
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.push('/unauthorized');
      return;
    }
  }, [isLoading, isAuthenticated, user, router, requireEmailVerified, allowedRoles]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render children until auth is verified
  if (!isAuthenticated) {
    return null;
  }

  if (requireEmailVerified && user && !user.emailVerified) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
