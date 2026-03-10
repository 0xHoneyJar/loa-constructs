'use client';

/**
 * Dynamic Labs Connect Button — cycle-039
 * @see sdd.md §6.2 DynamicConnectButton
 *
 * Opens the Dynamic Labs auth modal. On success, exchanges the
 * Dynamic JWT for our API JWT via connectDynamic().
 */

import { useCallback, useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useAuthStore } from '@/lib/stores/auth-store';

interface DynamicConnectButtonProps {
  className?: string;
  label?: string;
}

export function DynamicConnectButton({ className, label = 'Connect' }: DynamicConnectButtonProps) {
  const { sdkHasLoaded, setShowAuthFlow, primaryWallet, handleLogOut, getAuthToken } =
    useDynamicContext();
  const { connectDynamic, clearTokens, isAuthenticated } = useAuthStore();
  const [isExchanging, setIsExchanging] = useState(false);

  // Handle auth success — exchange Dynamic JWT for our API JWT
  const handleAuthSuccess = useCallback(async () => {
    if (isAuthenticated) return;

    setIsExchanging(true);
    try {
      const dynamicJwt = await getAuthToken();
      if (dynamicJwt) {
        await connectDynamic(dynamicJwt);
      }
    } catch {
      // Error handled in auth store
    } finally {
      setIsExchanging(false);
    }
  }, [getAuthToken, connectDynamic, isAuthenticated]);

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

  if (!sdkHasLoaded) {
    return (
      <div className={`h-7 w-20 animate-pulse rounded bg-void-border ${className ?? ''}`} />
    );
  }

  if (isExchanging) {
    return (
      <button
        disabled
        className={`font-mono text-[11px] text-bone-muted px-3 py-1 border border-void-border ${className ?? ''}`}
      >
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-b border-cyan-base mr-1.5" />
        Connecting...
      </button>
    );
  }

  if (primaryWallet && isAuthenticated) {
    return (
      <button
        onClick={handleDisconnect}
        className={`font-mono text-[11px] text-bone-muted hover:text-bone-base transition-colors px-3 py-1 border border-void-border hover:border-bone-ghost ${className ?? ''}`}
      >
        {primaryWallet.address.slice(0, 6)}...{primaryWallet.address.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`font-mono text-[11px] text-cyan-base hover:text-cyan-hover transition-colors px-3 py-1 border border-cyan-base/30 hover:border-cyan-base/60 ${className ?? ''}`}
    >
      {label}
    </button>
  );
}
