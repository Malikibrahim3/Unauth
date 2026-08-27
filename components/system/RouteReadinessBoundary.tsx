"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
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
  const routeRoot = root.querySelector<HTMLElement>(":scope > [data-surface-id], :scope > [data-state-id]");
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
    const update = () => {
      if (pendingResourceCount() > 0) {
        setState("loading");
        return;
      }
      const next = detectTerminalRouteState(root);
      if (next) setState(next);
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
      window.clearTimeout(timeout);
    };
  }, [pathname]);

  const resolved = state !== "loading" && state !== "timeout";
  return (
    <div
      ref={rootRef}
      className="ua-route-readiness"
      data-readiness="data-resolved"
      data-data-resolved={resolved ? "true" : "false"}
      data-route-state={state}
      data-requested-path={pathname}
    >
      {children}
      {state === "timeout" ? (
        <section className="ua-route-timeout" role="alert" data-state-id="route-readiness-timeout">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <h2>This page is taking too long to load</h2>
            <p>The requested route is still open. Reload it to retry the session and data request.</p>
          </div>
          <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        </section>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {state === "loading" ? "Loading page data" : state === "timeout" ? "Page loading timed out" : `Page ${state}`}
      </span>
    </div>
  );
}
