'use client';

import { createContext, useContext } from 'react';
import type { ConnectionState } from '@/lib/connections/getConnectionState';

const ConnectionStateContext = createContext<ConnectionState>({
  shopify: false,
  helpdesk: false,
  helpdeskProvider: null,
  bothConnected: false,
  neitherConnected: true,
  shopifyOnlyConnected: false,
  helpdeskOnlyConnected: false,
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
