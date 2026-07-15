import { Button } from './Button';
import { ButtonLink } from './ButtonLink';

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
    <div className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center p-[var(--space-5)]">
      <div
        role="alert"
        className="w-full rounded-[var(--ua-radius-card)] border p-[var(--space-6)] shadow-none"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="space-y-[var(--space-3)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
            Page Error
          </p>
          <div className="space-y-[var(--space-2)]">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          </div>
          <div
            className="rounded-[var(--radius-2)] border px-[var(--space-3)] py-[var(--space-2)] text-sm"
            style={{
              background: 'var(--bg-subtle)',
              borderColor: 'var(--border-muted)',
              color: 'var(--text-primary)',
            }}
          >
            Error type: <span className="font-medium">{safeErrorName}</span>
          </div>
          <div className="flex flex-wrap gap-[var(--space-3)] pt-[var(--space-1)]">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <ButtonLink href="/dashboard" variant="secondary" size="md">
              Go to dashboard
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
