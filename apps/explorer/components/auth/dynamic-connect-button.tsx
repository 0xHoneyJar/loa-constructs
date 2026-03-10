'use client';

/**
 * Dynamic Labs Connect Button — cycle-039
 * @see sdd.md §6.2 DynamicConnectButton
 *
 * Opens the Dynamic Labs auth modal. On success, exchanges the
 * Dynamic JWT for our API JWT via connectDynamic().
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';
import { useAuthStore } from '@/lib/stores/auth-store';

interface DynamicConnectButtonProps {
  className?: string;
  label?: string;
}

export function DynamicConnectButton(props: DynamicConnectButtonProps) {
  const isDynamicEnabled = Boolean(process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID);

  if (!isDynamicEnabled) {
    return (
      <button
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
  const { connectDynamic, clearTokens, isAuthenticated } = useAuthStore();
  const [isExchanging, setIsExchanging] = useState(false);
  const [sdkTimedOut, setSdkTimedOut] = useState(false);
  const exchangingRef = useRef(false);

  // Timeout: if SDK hasn't loaded after 5s, stop showing the loading state
  useEffect(() => {
    if (sdkHasLoaded) return;
    const timer = setTimeout(() => setSdkTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [sdkHasLoaded]);

  // Handle auth success — exchange Dynamic JWT for our API JWT
  // Uses ref-based lock to prevent concurrent exchanges on rapid wallet changes
  const handleAuthSuccess = useCallback(async () => {
    if (isAuthenticated || exchangingRef.current) return;

    exchangingRef.current = true;
    setIsExchanging(true);
    try {
      const dynamicJwt = getAuthToken();
      if (dynamicJwt) {
        await connectDynamic(dynamicJwt);
      }
    } catch {
      // Error handled in auth store
    } finally {
      exchangingRef.current = false;
      setIsExchanging(false);
    }
  }, [connectDynamic, isAuthenticated]);

  // Watch for wallet connection to trigger JWT exchange
  useEffect(() => {
    if (primaryWallet && !isAuthenticated && !isExchanging) {
      handleAuthSuccess();
    }
  }, [primaryWallet, isAuthenticated, isExchanging, handleAuthSuccess]);

  const handleClick = () => {
    setShowAuthFlow(true);
  };

  const handleDisconnect = async () => {
    clearTokens();
    await handleLogOut();
  };

  if (!sdkHasLoaded && !sdkTimedOut) {
    return (
      <div className={`h-7 w-20 animate-pulse rounded bg-void-border ${className ?? ''}`} />
    );
  }

  if (isExchanging) {
    return (
      <button
        type="button"
        disabled
        aria-busy="true"
        aria-live="polite"
        className={`font-mono text-[11px] text-bone-muted inline-flex items-center px-2 py-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-base/40 ${className ?? ''}`}
      >
        <span aria-hidden="true" className="inline-block h-3 w-3 animate-spin rounded-full border-b border-cyan-base mr-1.5" />
        Connecting...
      </button>
    );
  }

  if (primaryWallet && isAuthenticated) {
    return (
      <button
        type="button"
        onClick={handleDisconnect}
        className={`font-mono text-[11px] text-bone-muted hover:text-bone-base transition-colors px-2 py-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-base/40 ${className ?? ''}`}
      >
        {primaryWallet.address.slice(0, 6)}...{primaryWallet.address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`font-mono text-[11px] text-cyan-base hover:text-cyan-hover transition-colors px-2 py-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-cyan-base/40 ${className ?? ''}`}
    >
      {label}
    </button>
  );
}
