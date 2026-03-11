'use client';

/**
 * Dynamic Labs Connect Button — cycle-039
 * @see sdd.md §6.2 DynamicConnectButton
 *
 * Thin wrapper around Dynamic SDK auth flow.
 * Matches midi-interface/mcv-interface pattern: button calls setShowAuthFlow(true),
 * SDK handles everything, primaryWallet is the auth state.
 */

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useEffect, useState } from 'react';

interface DynamicConnectButtonProps {
  className?: string;
  label?: string;
}

export function DynamicConnectButton(props: DynamicConnectButtonProps) {
  const isDynamicEnabled = Boolean(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID);

  if (!isDynamicEnabled) {
    return (
      <button
        type="button"
        disabled
        className={`font-mono text-[11px] text-bone-ghost ${props.className ?? ''}`}
        title="Wallet auth is not configured"
      >
        {props.label ?? 'Connect'}
      </button>
    );
  }

  return <DynamicConnectButtonEnabled {...props} />;
}

function DynamicConnectButtonEnabled({ className, label = 'Connect' }: DynamicConnectButtonProps) {
  const { sdkHasLoaded, setShowAuthFlow, primaryWallet, handleLogOut } =
    useDynamicContext();
  const [sdkTimedOut, setSdkTimedOut] = useState(false);

  // Timeout: if SDK hasn't loaded after 5s, stop showing the loading state
  useEffect(() => {
    if (sdkHasLoaded) return;
    const timer = setTimeout(() => setSdkTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [sdkHasLoaded]);

  if (!sdkHasLoaded && !sdkTimedOut) {
    return (
      <div className={`h-7 w-20 animate-pulse rounded bg-void-border ${className ?? ''}`} />
    );
  }

  if (primaryWallet) {
    return (
      <button
        type="button"
        onClick={() => handleLogOut()}
        className={`font-mono text-[11px] text-bone-muted hover:text-bone-base transition-colors px-2 py-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-base/40 ${className ?? ''}`}
      >
        {primaryWallet.address.slice(0, 6)}...{primaryWallet.address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowAuthFlow(true)}
      className={`font-mono text-[11px] text-cyan-base hover:text-cyan-dim transition-colors px-2 py-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-base/40 ${className ?? ''}`}
    >
      {label}
    </button>
  );
}
