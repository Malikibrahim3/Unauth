"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";

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
    <div className="mx-auto flex min-h-[55vh] w-full max-w-3xl items-center p-4 sm:p-6">
      <section
        className="w-full rounded-[var(--ua-radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-none"
        role="alert"
      >
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--risk-critical)_10%,transparent)]">
          <AlertTriangle className="h-4 w-4 text-[var(--risk-critical)]" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            size="md"
            onClick={reset}
            leadingIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            Try again
          </Button>
          <ButtonLink href={fallbackHref} variant="secondary" size="md">
            Leave this view
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
