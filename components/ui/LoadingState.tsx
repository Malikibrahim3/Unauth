import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from './Button';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton rounded-[var(--radius-1)]', className)}
      style={style}
      aria-hidden="true"
    />
  );
}

interface LoadingStateProps {
  rows?: number;
  className?: string;
}

/** Full-section loading placeholder using skeleton rows */
function LoadingState({ rows = 6, className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-[var(--space-3)] p-[var(--space-5)]', className)} aria-busy="true" aria-label="Loading…">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-[var(--space-4)]">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-[var(--space-2)]">
            <Skeleton style={{ width: `${55 + (i % 3) * 15}%`, height: 14 }} />
            <Skeleton style={{ width: `${35 + (i % 4) * 10}%`, height: 12 }} />
          </div>
          <Skeleton style={{ width: 60, height: 24 }} className="rounded-[var(--radius-1)]" />
        </div>
      ))}
    </div>
  );
}

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
        className="w-full rounded-[var(--radius-3)] border p-[var(--space-6)] shadow-sm"
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
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center justify-center rounded-[var(--radius-2)] border px-[14px] text-[14px] font-medium transition-colors"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                background: 'var(--surface)',
              }}
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline spinner - buttons and row-level operations only */
function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} size={size} aria-hidden="true" />;
}
