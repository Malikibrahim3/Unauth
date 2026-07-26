import { cn } from '@/lib/utils';

export type LoadingSkeletonVariant = 'shell' | 'page' | 'metric-group' | 'table' | 'detail' | 'drawer' | 'form' | 'chart';

type LoadingSkeletonProps = {
  variant?: LoadingSkeletonVariant;
  rows?: number;
  title?: string;
  className?: string;
};

function Bone({ className }: { className: string }) {
  return <div className={cn('skeleton rounded-[var(--ua-radius-control)] bg-[var(--ua-surface-muted)]', className)} aria-hidden="true" />;
}

export function LoadingSkeleton({ variant = 'page', rows = 6, title = 'Loading workspace', className }: LoadingSkeletonProps) {
  if (variant === 'shell') return <div className={cn('flex min-h-screen flex-col gap-4 p-4 sm:p-6', className)} aria-busy="true" aria-label={title}><Bone className="h-10 w-full" /><div className="flex gap-4"><Bone className="h-[calc(100vh-6rem)] w-56 shrink-0" /><div className="min-w-0 flex-1 space-y-4"><Bone className="h-8 w-56" /><Bone className="h-4 w-full max-w-xl" /><LoadingSkeleton variant="table" rows={rows} /></div></div><span className="sr-only">{title}</span></div>;
  if (variant === 'metric-group') return <div className={cn('grid grid-cols-2 overflow-hidden rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] md:grid-cols-4', className)} aria-busy="true" aria-label={title}>{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2 border-[var(--ua-border-subtle)] p-4 first:border-0 md:border-l"><Bone className="h-3 w-20" /><Bone className="h-7 w-16" /><Bone className="h-3 w-28" /></div>)}</div>;
  if (variant === 'table') return <div className={cn('overflow-hidden rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)]', className)} aria-busy="true" aria-label={title}><Bone className="h-11 w-full rounded-none" />{Array.from({ length: rows }, (_, index) => <div key={index} className="flex h-14 items-center gap-4 border-t border-[var(--ua-border-subtle)] px-4"><Bone className="h-4 w-32" /><Bone className="h-4 w-24" /><Bone className="h-4 w-16" /></div>)}<span className="sr-only">{title}</span></div>;
  if (variant === 'drawer') return <div className={cn('space-y-4 p-4', className)} aria-busy="true" aria-label={title}><Bone className="h-6 w-48" /><Bone className="h-4 w-full" /><Bone className="h-24 w-full" /><Bone className="h-32 w-full" /><span className="sr-only">{title}</span></div>;
  if (variant === 'form') return <div className={cn('space-y-4', className)} aria-busy="true" aria-label={title}>{Array.from({ length: Math.max(3, rows) }, (_, index) => <div key={index} className="space-y-2"><Bone className="h-3 w-28" /><Bone className="h-9 w-full" /></div>)}<Bone className="h-9 w-28" /><span className="sr-only">{title}</span></div>;
  if (variant === 'chart') return <div className={cn('space-y-3 rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] p-4', className)} aria-busy="true" aria-label={title}><Bone className="h-4 w-40" /><Bone className="h-48 w-full" /><span className="sr-only">{title}</span></div>;
  if (variant === 'detail') return <div className={cn('grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]', className)} aria-busy="true" aria-label={title}><div className="space-y-3">{Array.from({ length: Math.max(3, rows) }, (_, index) => <Bone key={index} className="h-20 w-full rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)]" />)}</div><Bone className="h-72 w-full rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)]" /><span className="sr-only">{title}</span></div>;
  return <div className={cn('space-y-5', className)} aria-busy="true" aria-label={title}><div className="space-y-2"><Bone className="h-7 w-48" /><Bone className="h-4 w-full max-w-xl" /></div><LoadingSkeleton variant="table" rows={rows} title={title} /><span className="sr-only">{title}</span></div>;
}
