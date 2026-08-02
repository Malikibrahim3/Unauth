"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import { AuthenticatedPanel } from "@/components/authenticated/AuthenticatedPanel";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";

export function OperationalRouteError({
  title,
  description,
  reset,
  fallbackHref = "/dashboard",
  digest,
}: {
  title: string;
  description: string;
  reset: () => void;
  fallbackHref?: string;
  /** Logged for support correlation; never rendered (RUN-11). */
  digest?: string;
}) {
  if (typeof window !== 'undefined' && digest) {
    console.error('[route-error]', { digest });
  }
  return (
    <div>
      {/* RUN-11: the title already says what failed; an "error class" eyebrow
          only adds implementation vocabulary. */}
      <AuthenticatedPageHeader title={title} subtitle={description} />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel bodyClassName="flex flex-wrap items-center justify-between gap-3 p-4" capabilityId="error.recovery" >
          <div className="flex items-center gap-3" role="alert">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[color-mix(in_srgb,var(--ua-risk-critical)_8%,var(--ua-surface-primary))]">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--ua-risk-critical)]" aria-hidden="true" />
            </span>
            <p className="max-w-xl text-[length:var(--ua-text-metadata-size)] leading-5 text-[var(--ua-text-secondary)]">No data or workflow state was changed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={reset} className="ua-text-label inline-flex h-8 items-center gap-2 rounded-[var(--ua-radius-control)] bg-[var(--ua-action-primary)] px-3 text-[var(--ua-action-primary-fg)]">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Try again
            </button>
            <Link href={fallbackHref} className="ua-text-label inline-flex h-8 items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 text-[var(--ua-text-secondary)]">Leave this page</Link>
          </div>
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
