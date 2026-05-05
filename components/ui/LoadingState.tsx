import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
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
export function LoadingState({ rows = 6, className }: LoadingStateProps) {
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

/** Inline spinner — buttons and row-level operations only */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
