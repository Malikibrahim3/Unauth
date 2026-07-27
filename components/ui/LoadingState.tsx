import Link from 'next/link';
import { Button } from './Button';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

interface ErrorBoundaryUIProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}

/**
 * Reusable route error state.
 *
 * RUN-11: the merchant sees what failed and what to do about it. The
 * JavaScript error name used to be rendered as "Error type: TypeError", which
 * tells a merchant nothing and tells an attacker something; the diagnostic
 * identifier now goes to the log only, where support can correlate it.
 */
export function ErrorBoundaryUI({
  error,
  reset,
  title = 'Something went wrong',
  description = 'We could not load this page. You can try again, or go back to Overview.',
}: ErrorBoundaryUIProps) {
  // Diagnostics stay in telemetry, never on screen.
  if (typeof window !== 'undefined' && error) {
    console.error('[route-error]', { digest: error.digest ?? null, name: error.name, message: error.message });
  }

  return (
    <div>
      <AuthenticatedPageHeader title={title} subtitle={description} />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel bodyClassName="grid gap-3 p-4" capabilityId="error.recovery">
          <div role="alert" className="rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] px-3 py-2 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)]">
            Nothing was changed. If this keeps happening, contact support.
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center justify-center rounded-[var(--ua-radius-control)] border px-3 text-[length:var(--ua-text-micro-size)] font-semibold transition-colors"
              style={{
                borderColor: 'var(--ua-border-default)',
                color: 'var(--ua-text-primary)',
                background: 'var(--ua-surface-primary)',
              }}
            >
              Go to Overview
            </Link>
          </div>
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
