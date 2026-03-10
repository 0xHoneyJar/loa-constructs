'use client';

/**
 * Dynamic Labs Provider — cycle-039
 * @see sdd.md §6.1 DynamicProvider
 *
 * Provider nesting matches the 0xHoneyJar ecosystem pattern:
 * DynamicContextProvider > WagmiProvider > QueryClientProvider > DynamicWagmiConnector
 */

import { type ReactNode } from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

  return (
    <DynamicContextProvider
      settings={{
        environmentId,
        initialAuthenticationMode: 'connect-and-sign',
        walletConnectors: [EthereumWalletConnectors],
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
