import { cn } from '@/lib/utils';

export type LoadingSkeletonVariant = 'shell' | 'page' | 'metric-group' | 'table' | 'detail' | 'drawer' | 'form' | 'chart';

type LoadingSkeletonProps = {
  variant?: LoadingSkeletonVariant;
  rows?: number;
  title?: string;
  className?: string;
  /** Internal composition flag; nested geometry must not repeat the live announcement. */
  announce?: boolean;
};

function Bone({ className }: { className: string }) {
  return <div className={cn('skeleton rounded-[var(--ua-radius-control)] bg-[var(--ua-surface-muted)]', className)} aria-hidden="true" />;
}

export function LoadingSkeleton({ variant = 'page', rows = 6, title = 'Loading workspace', className, announce = true }: LoadingSkeletonProps) {
  const stateProps = { 'aria-busy': true, 'aria-label': title, 'data-skeleton-variant': variant } as const;
  const announcement = announce ? <span className="sr-only" role="status">{title}</span> : null;
  if (variant === 'shell') return <div className={cn('flex min-h-screen flex-col gap-4 p-4 sm:p-6', className)} {...stateProps}><Bone className="h-10 w-full" /><div className="flex gap-4"><Bone className="h-[calc(100vh-6rem)] w-56 shrink-0" /><div className="min-w-0 flex-1 space-y-4"><Bone className="h-8 w-56" /><Bone className="h-4 w-full max-w-xl" /><LoadingSkeleton variant="table" rows={rows} title={title} announce={false} /></div></div>{announcement}</div>;
  if (variant === 'metric-group') return <div className={cn('ua-metric-group', className)} {...stateProps}>{Array.from({ length: 4 }, (_, index) => <div key={index} className="ua-metric-group__item space-y-2"><Bone className="h-3 w-20" /><Bone className="h-7 w-16" /><Bone className="h-3 w-28" /></div>)}{announcement}</div>;
  if (variant === 'table') return <div className={cn('overflow-hidden rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)]', className)} {...stateProps}><Bone className="h-[var(--ua-table-header-height)] w-full rounded-none" />{Array.from({ length: rows }, (_, index) => <div key={index} className="flex h-[var(--ua-table-row-height)] items-center gap-4 border-t border-[var(--ua-border-subtle)] px-4"><Bone className="h-4 w-32" /><Bone className="h-4 w-24" /><Bone className="h-4 w-16" /></div>)}{announcement}</div>;
  if (variant === 'drawer') return <div className={cn('space-y-4 p-4', className)} {...stateProps}><Bone className="h-6 w-48" /><Bone className="h-4 w-full" /><Bone className="h-24 w-full" /><Bone className="h-32 w-full" />{announcement}</div>;
  if (variant === 'form') return <div className={cn('space-y-4', className)} {...stateProps}>{Array.from({ length: Math.max(3, rows) }, (_, index) => <div key={index} className="space-y-2"><Bone className="h-3 w-28" /><Bone className="h-9 w-full" /></div>)}<Bone className="h-9 w-28" />{announcement}</div>;
  if (variant === 'chart') return <div className={cn('space-y-3 rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] p-4', className)} {...stateProps}><Bone className="h-4 w-40" /><Bone className="h-48 w-full" />{announcement}</div>;
  if (variant === 'detail') return <div className={cn('grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]', className)} {...stateProps}><div className="space-y-3">{Array.from({ length: Math.max(3, rows) }, (_, index) => <Bone key={index} className="h-20 w-full rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)]" />)}</div><Bone className="h-72 w-full rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)]" />{announcement}</div>;
  return <div className={cn('space-y-5', className)} {...stateProps}><div className="space-y-2"><Bone className="h-7 w-48" /><Bone className="h-4 w-full max-w-xl" /></div><LoadingSkeleton variant="table" rows={rows} title={title} announce={false} />{announcement}</div>;
}
