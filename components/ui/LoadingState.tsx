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
 * Reusable route error state that avoids leaking raw backend messages.
 */
export function ErrorBoundaryUI({
  error,
  reset,
  title = 'Something went wrong',
  description = 'We could not load this page. You can try again or head back to the dashboard.',
}: ErrorBoundaryUIProps) {
  const safeErrorName = error?.name?.trim() || 'UnexpectedError';

  return (
    <div>
      <AuthenticatedPageHeader eyebrow="Page error" title={title} subtitle={description} />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel bodyClassName="grid gap-3 p-4" capabilityId="error.recovery">
          <div role="alert" className="rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] px-3 py-2 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)]">
            Error type: <span className="font-medium text-[var(--ua-text-primary)]">{safeErrorName}</span>
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
              Go to dashboard
            </Link>
          </div>
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
