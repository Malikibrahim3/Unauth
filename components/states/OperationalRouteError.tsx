"use client";

import Link from "next/link";
import { AlertTriangle, LifeBuoy, RotateCcw } from "lucide-react";
import { usePathname } from "next/navigation";
import { PageFrame } from "@/components/ui/PageFrame";
import { AuthenticatedPanel } from "@/components/authenticated/AuthenticatedPanel";
import { getPageTitleForPath } from "@/lib/navigation/appRoutes";

export function OperationalRouteError({
  title,
  description,
  reset,
  fallbackHref = "/overview",
  digest,
  stateId,
}: {
  title: string;
  description: string;
  reset: () => void;
  fallbackHref?: string;
  /** Logged for support correlation; never rendered (RUN-11). */
  digest?: string;
  stateId?: string;
}) {
  const pathname = usePathname();
  const routeLabel = getPageTitleForPath(pathname) ?? "This workspace page";
  const fallbackLabel = getPageTitleForPath(fallbackHref) ?? "Overview";
  if (typeof window !== 'undefined' && digest) {
    console.error('[route-error]', { digest });
  }
  return (
    // RUN-11: the title already says what failed; an "error class" eyebrow
    // only adds implementation vocabulary.
    <PageFrame
      title={title}
      subtitle={description}
      meta={<span>Affected work · {routeLabel}</span>}
      surfaceId="route-error-boundary"
      archetype="P12"
    >
      <div data-state-id={stateId ?? 'route-error-boundaries'}>
        <AuthenticatedPanel bodyClassName="ua-route-error" capabilityId="error.recovery">
          <div className="ua-route-error__impact" role="alert">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] bg-[color-mix(in_srgb,var(--uo-route-risk-critical)_8%,var(--uo-route-surface-primary))]">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--uo-route-risk-critical)]" aria-hidden="true" />
            </span>
            <div>
              <strong>The requested data is unavailable</strong>
              <p>It has not been treated as zero, complete, or successful.</p>
            </div>
          </div>
          <dl className="ua-route-error__context">
            <div><dt>Saved state</dt><dd>No data or workflow state was changed. This failed load did not save a new result.</dd></div>
            <div><dt>Unsaved work</dt><dd>Retry first to stay on this route. Leaving may discard input that had not been saved.</dd></div>
            <div><dt>Support context</dt><dd>If retry fails, include the workspace name, page address, and time. Do not send secrets or customer details.</dd></div>
          </dl>
          <div className="ua-route-error__actions">
            <button type="button" onClick={reset} className="ua-text-label inline-flex min-h-11 items-center gap-2 rounded-[var(--uo-route-radius-control)] bg-[var(--uo-route-action-primary)] px-3 text-[var(--uo-route-action-primary-fg)]">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Try again
            </button>
            <Link href={fallbackHref} className="ua-text-label inline-flex min-h-11 items-center rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-default)] px-3 text-[var(--uo-route-text-secondary)]">Go to {fallbackLabel}</Link>
            <Link href="/help?q=unavailable" className="ua-text-label inline-flex min-h-11 items-center gap-2 px-2 text-[var(--uo-route-text-link)]"><LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />Open recovery help</Link>
          </div>
        </AuthenticatedPanel>
      </div>
    </PageFrame>
  );
}
