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
  shopifyOnlyConnected: false,
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
