"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AUTH_RETURN_COOKIE } from "@/lib/auth/routeContinuity";
import {
  pendingResourceCount,
  subscribeToPendingResources,
} from "@/lib/react/useFetchJson";

export type TerminalRouteState =
  | "loaded"
  | "zero"
  | "empty"
  | "unavailable"
  | "forbidden"
  | "not-found"
  | "error";

const TIMEOUT_MS = 15_000;

function stateFromMarker(marker: string | undefined): TerminalRouteState | null {
  if (!marker) return null;
  if (marker.includes("not-found")) return "not-found";
  if (marker.includes("forbidden") || marker.includes("access-blocked")) return "forbidden";
  if (marker.includes("unavailable")) return "unavailable";
  if (marker.includes("error") || marker.includes("expired")) return "error";
  if (marker.includes("empty") || marker.includes("first-use") || marker.includes("no-result")) return "empty";
  if (marker.includes("zero")) return "zero";
  if (marker.includes("loading") || marker.includes("skeleton")) return null;
  return "loaded";
}

export function detectTerminalRouteState(root: HTMLElement): TerminalRouteState | null {
  const routeRoot = root.querySelector<HTMLElement>("[data-surface-id], [data-state-id]");
  if (!routeRoot) return null;
  if (routeRoot.matches('[aria-busy="true"]') || routeRoot.querySelector('[aria-busy="true"]')) return null;

  const ownMarker = routeRoot.dataset.stateId ?? routeRoot.dataset.surfaceId;
  const ownState = stateFromMarker(ownMarker);
  if (ownState && ownState !== "loaded") return ownState;

  // Error and not-found frames keep the page identity on the root and put the
  // actionable state marker one level inside it. Deliberately ignore deeper
  // unavailable sub-states such as a missing optional report owner.
  const immediateState = Array.from(routeRoot.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && Boolean(child.dataset.stateId),
  );
  const nestedState = stateFromMarker(immediateState?.dataset.stateId);
  return nestedState ?? ownState ?? "loaded";
}

/**
 * One observable readiness contract for route capture and runtime recovery.
 * The authenticated shell remains mounted while this boundary distinguishes
 * data loading from a labelled terminal state.
 */
export function RouteReadinessBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TerminalRouteState | "loading" | "timeout">("loading");

  useEffect(() => {
    const query = searchParams.toString();
    const returnPath = `${pathname}${query ? `?${query}` : ""}`;
    document.cookie = `${AUTH_RETURN_COOKIE}=${encodeURIComponent(returnPath)}; Path=/; Max-Age=604800; SameSite=Lax`;
  }, [pathname, searchParams]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    setState("loading");
    let settleTimer: number | null = null;
    const update = () => {
      if (pendingResourceCount() > 0) {
        if (settleTimer !== null) {
          window.clearTimeout(settleTimer);
          settleTimer = null;
        }
        setState("loading");
        return;
      }
      const next = detectTerminalRouteState(root);
      if (!next || settleTimer !== null) return;
      // The page may already contain the final supplied tree when the last
      // resource settles. Do not keep that visible tree inert for an
      // additional debounce window; the boundary is already observing both
      // resource settlement and the DOM mutation that produced it.
      settleTimer = window.setTimeout(() => {
        settleTimer = null;
        if (pendingResourceCount() !== 0) return;
        const settled = detectTerminalRouteState(root);
        if (settled) setState(settled);
      }, 0);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, childList: true, subtree: true });
    const unsubscribePending = subscribeToPendingResources(update);
    const timeout = window.setTimeout(() => {
      setState((current) => (current === "loading" ? "timeout" : current));
    }, TIMEOUT_MS);
    return () => {
      observer.disconnect();
      unsubscribePending();
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  const resolved = state !== "loading" && state !== "timeout";
  // Readiness is observational, not an interaction lock. A missing marker,
  // slow resource or timeout must never disable navigation and recovery.
  // Individual forms and modal focus guards own their disabled states.
  return (
    <div
      ref={rootRef}
      data-readiness="data-resolved"
      data-data-resolved={resolved ? "true" : "false"}
      data-route-state={state}
      data-requested-path={pathname}
      aria-busy={!resolved || undefined}
      style={{ display: 'contents' }}
    >
      {children}
      <span role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>
        {state === "loading" ? "Loading page data" : state === "timeout" ? "Page loading timed out" : `Page ${state}`}
      </span>
    </div>
  );
}
