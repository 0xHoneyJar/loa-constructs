'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';
import { DynamicConnectButton } from '@/components/auth/dynamic-connect-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthNav() {
  const { isOrgMember, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton className="h-9 w-24" />;
  }

  return (
    <div className="flex items-center gap-3">
      {isAuthenticated && (
        <Button asChild variant="outline">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      )}
      {isOrgMember && (
        <Badge className="border-cyan-dim text-cyan-dim">
          org
        </Badge>
      )}
      <DynamicConnectButton />
    </div>
  );
}
