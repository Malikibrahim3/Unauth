'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Lets a page replace the label of the last (current-page) breadcrumb segment
 * in the authenticated route shell. Used by detail routes whose URL segment
 * is an opaque UUID — e.g. /cases/[id] can expose the human case reference.
 */
type BreadcrumbOverride = {
  label: string | null;
  setLabel: (label: string | null) => void;
};

const BreadcrumbOverrideContext = createContext<BreadcrumbOverride>({
  label: null,
  setLabel: () => {},
});

export function BreadcrumbOverrideProvider({ children }: { children: React.ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const value = useMemo(() => ({ label, setLabel }), [label]);
  return (
    <BreadcrumbOverrideContext.Provider value={value}>
      {children}
    </BreadcrumbOverrideContext.Provider>
  );
}

/** Read the current authenticated-shell breadcrumb override. */
export function useBreadcrumbOverride(): string | null {
  return useContext(BreadcrumbOverrideContext).label;
}

/** Set the current-page breadcrumb label; cleared automatically on unmount. */
export function useBreadcrumbLabel(label: string | null) {
  const { setLabel } = useContext(BreadcrumbOverrideContext);
  const stableSet = useCallback(setLabel, [setLabel]);
  useEffect(() => {
    stableSet(label);
    return () => stableSet(null);
  }, [label, stableSet]);
}
