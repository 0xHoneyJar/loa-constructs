'use client';

/**
 * Dynamic Labs Provider — cycle-039
 * @see sdd.md §6.1 DynamicProvider
 *
 * Provider nesting matches the 0xHoneyJar ecosystem pattern:
 * DynamicContextProvider > WagmiProvider > QueryClientProvider > DynamicWagmiConnector
 *
 * JWT exchange happens in onAuthSuccess callback (fire-and-forget),
 * not in the connect button. Matches midi-interface/mcv-interface pattern.
 */

import { type ReactNode } from 'react';
import { DynamicContextProvider, getAuthToken } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth-store';

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [mainnet],
  multiInjectedProviderDiscovery: false,
  transports: {
    [mainnet.id]: http(),
  },
});

const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;

export function DynamicProvider({ children }: { children: ReactNode }) {
  if (!environmentId) {
    // Graceful fallback — app works without Dynamic Labs configured
    return <>{children}</>;
  }

  return <DynamicProviderInner>{children}</DynamicProviderInner>;
}

function DynamicProviderInner({ children }: { children: ReactNode }) {
  const { connectDynamic } = useAuthStore();

  return (
    <DynamicContextProvider
      settings={{
        environmentId: environmentId!,
        initialAuthenticationMode: 'connect-and-sign',
        walletConnectors: [EthereumWalletConnectors],
        events: {
          onAuthSuccess: () => {
            // Fire-and-forget JWT exchange — doesn't block UI
            const dynamicJwt = getAuthToken();
            if (dynamicJwt) {
              connectDynamic(dynamicJwt).catch(() => {
                // Non-fatal — wallet is still connected, API auth just failed
              });
            }
          },
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            {children}
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
