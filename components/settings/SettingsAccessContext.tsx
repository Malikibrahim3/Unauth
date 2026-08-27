'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Permission } from '@/lib/permissions';

const SettingsAccessContext = createContext<readonly Permission[]>([]);

export function SettingsAccessProvider({
  permissions,
  children,
}: {
  permissions: readonly Permission[];
  children: ReactNode;
}) {
  return (
    <SettingsAccessContext.Provider value={permissions}>
      {children}
    </SettingsAccessContext.Provider>
  );
}

export function useSettingsPermissions() {
  return useContext(SettingsAccessContext);
}
