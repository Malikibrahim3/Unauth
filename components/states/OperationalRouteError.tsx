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
}: {
  title: string;
  description: string;
  reset: () => void;
  fallbackHref?: string;
}) {
  return (
    <div>
      <AuthenticatedPageHeader
        eyebrow="Recoverable error"
        title={title}
        subtitle={description}
      />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel bodyClassName="flex flex-wrap items-center justify-between gap-3 p-4" capabilityId="error.recovery" >
          <div className="flex items-center gap-3" role="alert">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--risk-critical)_8%,var(--surface))]">
              <AlertTriangle className="h-3.5 w-3.5 text-[var(--risk-critical)]" />
            </span>
            <p className="max-w-xl text-[11px] leading-5 text-[var(--text-secondary)]">No data or workflow state was changed.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={reset} className="inline-flex h-8 items-center gap-2 rounded-[var(--ua-radius-input)] bg-[var(--accent)] px-3 text-[11px] font-semibold text-white">
              <RotateCcw className="h-3.5 w-3.5" />Try again
            </button>
            <Link href={fallbackHref} className="inline-flex h-8 items-center rounded-[var(--ua-radius-input)] border border-[var(--border)] px-3 text-[11px] font-semibold text-[var(--text-secondary)]">Leave this view</Link>
          </div>
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
