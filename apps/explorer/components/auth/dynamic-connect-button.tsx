'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface DynamicConnectButtonProps {
  className?: string;
  label?: string;
}

export function DynamicConnectButton(props: DynamicConnectButtonProps) {
  const isDynamicEnabled = Boolean(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID);

  if (!isDynamicEnabled) {
    return (
      <Button
        variant="outline"
        disabled
        className={props.className}
        title="Wallet auth is not configured"
      >
        {props.label ?? 'Sign in'}
      </Button>
    );
  }

  return <DynamicConnectButtonEnabled {...props} />;
}

function DynamicConnectButtonEnabled({ className, label = 'Sign in' }: DynamicConnectButtonProps) {
  const { sdkHasLoaded, setShowAuthFlow, primaryWallet, handleLogOut } =
    useDynamicContext();
  const [sdkTimedOut, setSdkTimedOut] = useState(false);

  useEffect(() => {
    if (sdkHasLoaded) return;
    const timer = setTimeout(() => setSdkTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [sdkHasLoaded]);

  if (!sdkHasLoaded && !sdkTimedOut) {
    return <Skeleton className={`h-9 w-24 ${className ?? ''}`} />;
  }

  if (primaryWallet) {
    return (
      <Button
        variant="outline"
        onClick={() => handleLogOut()}
        className={className}
      >
        {primaryWallet.address.slice(0, 6)}...{primaryWallet.address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => setShowAuthFlow(true)}
      className={`text-bone-base hover:bg-void-raised hover:text-bone-bright ${className ?? ''}`}
    >
      {label}
    </Button>
  );
}
