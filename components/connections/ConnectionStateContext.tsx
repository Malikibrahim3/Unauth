'use client';

import { createContext, useContext } from 'react';
import type { ConnectionState } from '@/lib/connections/getConnectionState';

const ConnectionStateContext = createContext<ConnectionState>({
  orderSourceConnected: false,
  orderSourcePlatform: null,
  orderSourceStoreKey: null,
  shopify: false,
  helpdesk: false,
  helpdeskProvider: null,
  bothConnected: false,
  neitherConnected: true,
  orderSourceOnlyConnected: false,
  helpdeskOnlyConnected: false,
  shopDomain: null,
  linkState: 'not_connected',
  trackingConnected: false,
});

export function ConnectionStateProvider({
  value,
  children,
}: {
  value: ConnectionState;
  children: React.ReactNode;
}) {
  return (
    <ConnectionStateContext.Provider value={value}>
      {children}
    </ConnectionStateContext.Provider>
  );
}

export function useConnectionState(): ConnectionState {
  return useContext(ConnectionStateContext);
}

/**
 * Whether the current merchant is a demo merchant. When true, the app layout
 * already shows a demo-data banner, so per-page connection prompts should
 * suppress themselves to avoid stacked banners.
 */
const DemoModeContext = createContext<boolean>(false);

export function DemoModeProvider({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): boolean {
  return useContext(DemoModeContext);
}
