'use client';

import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AuthenticatedShellPresentation =
  | { kind: 'first-run' }
  | { kind: 'route-error' }
  | { kind: 'not-found' }
  | { kind: 'loading-registry' }
  | { kind: 'loading-detail' };

/**
 * Lets a page replace the label of the last (current-page) breadcrumb segment
 * in the authenticated route shell. Used by detail routes whose URL segment
 * is an opaque UUID — e.g. /cases/[id] can expose the human case reference.
 */
type BreadcrumbOverride = {
  label: string | null;
  setLabel: (label: string | null) => void;
  detail: string | null;
  setDetail: (detail: string | null) => void;
  parent: { label: string; href: string } | null;
  setParent: (parent: { label: string; href: string } | null) => void;
  presentation: AuthenticatedShellPresentation | null;
  setPresentation: (presentation: AuthenticatedShellPresentation | null) => void;
};

const BreadcrumbOverrideContext = createContext<BreadcrumbOverride>({
  label: null,
  setLabel: () => {},
  detail: null,
  setDetail: () => {},
  parent: null,
  setParent: () => {},
  presentation: null,
  setPresentation: () => {},
});

export function BreadcrumbOverrideProvider({ children }: { children: React.ReactNode }) {
  const scope = usePathname();
  const [labelState, setLabelState] = useState<{ scope: string | null; value: string | null } | null>(null);
  const [detailState, setDetailState] = useState<{ scope: string | null; value: string | null } | null>(null);
  const [parentState, setParentState] = useState<{ scope: string | null; value: { label: string; href: string } | null } | null>(null);
  const [presentation, setPresentation] = useState<AuthenticatedShellPresentation | null>(null);
  const setLabel = useCallback((value: string | null) => setLabelState(current => value === null && current?.scope !== scope ? current : { scope, value }), [scope]);
  const setDetail = useCallback((value: string | null) => setDetailState(current => value === null && current?.scope !== scope ? current : { scope, value }), [scope]);
  const setParent = useCallback((value: { label: string; href: string } | null) => setParentState(current => value === null && current?.scope !== scope ? current : { scope, value }), [scope]);
  const label = labelState?.scope === scope ? labelState.value : null;
  const detail = detailState?.scope === scope ? detailState.value : null;
  const parent = parentState?.scope === scope ? parentState.value : null;
  const value = useMemo(
    () => ({ label, setLabel, detail, setDetail, parent, setParent, presentation, setPresentation }),
    [detail, label, parent, presentation, setLabel, setDetail, setParent],
  );
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

/** Read route-owned source/freshness copy for a supplied detail topbar. */
export function useBreadcrumbDetailOverride(): string | null {
  return useContext(BreadcrumbOverrideContext).detail;
}

export function useAuthenticatedShellPresentationOverride(): AuthenticatedShellPresentation | null {
  return useContext(BreadcrumbOverrideContext).presentation;
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

/** Set the route-owned source/freshness copy; cleared automatically on unmount. */
export function useBreadcrumbDetail(detail: string | null) {
  const { setDetail } = useContext(BreadcrumbOverrideContext);
  const stableSet = useCallback(setDetail, [setDetail]);
  useEffect(() => {
    stableSet(detail);
    return () => stableSet(null);
  }, [detail, stableSet]);
}

/** Select one of the supplied shell-state headers while this route state is mounted. */
export function useAuthenticatedShellPresentation(
  presentation: AuthenticatedShellPresentation,
) {
  const { setPresentation } = useContext(BreadcrumbOverrideContext);
  const kind = presentation.kind;
  useEffect(() => {
    setPresentation({ kind });
    return () => setPresentation(null);
  }, [kind, setPresentation]);
}

/** A route-resolved ancestor, e.g. the customer owning an evidence builder. */
export function useBreadcrumbParentOverride() {
  return useContext(BreadcrumbOverrideContext).parent;
}

export function useBreadcrumbParent(parent: { label: string; href: string } | null) {
  const { setParent } = useContext(BreadcrumbOverrideContext);
  const label = parent?.label;
  const href = parent?.href;
  useEffect(() => {
    setParent(label && href ? { label, href } : null);
    return () => setParent(null);
  }, [label, href, setParent]);
}
