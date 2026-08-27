'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { DELAY } from '@/lib/design/motion';

export type LoadingSkeletonVariant = 'shell' | 'page' | 'metric-group' | 'table' | 'detail' | 'drawer' | 'form' | 'chart' | 'header' | 'panel';

type LoadingSkeletonProps = {
  variant?: LoadingSkeletonVariant;
  rows?: number;
  title?: string;
  className?: string;
  /** Internal composition flag; nested geometry must not repeat the live announcement. */
  announce?: boolean;
  /**
   * §7.6: below this, a resource shows no skeleton at all. Internal
   * recursive composition (the nested table inside `shell`/`page`) passes
   * `0` — the outer call already absorbed the delay once.
   */
  delayMs?: number;
};

/**
 * The one canonical skeleton bone (§7.6). Its background comes from the
 * shared `.skeleton` class (states.css) — callers may pass `style` for
 * geometry (a variable width/height/position) but must never set
 * `background` there, which is exactly how two visually different bone
 * colours coexisted before this consolidation.
 */
export function Bone({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('skeleton rounded-[var(--uo-route-radius-control)]', className)} style={style} aria-hidden="true" />;
}

/** §7.6: explanatory copy once a resource has been loading for 8s straight. */
function useSlowLoadNotice(active: boolean): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), DELAY.slowLoadNotice);
    return () => clearTimeout(timer);
  }, [active]);
  return slow;
}

export function LoadingSkeleton({
  variant = 'page',
  rows = 6,
  title = 'Loading workspace',
  className,
  announce = true,
  delayMs = DELAY.skeleton,
}: LoadingSkeletonProps) {
  const [visible, setVisible] = useState(delayMs <= 0);
  const slow = useSlowLoadNotice(announce);

  useEffect(() => {
    if (delayMs <= 0) return;
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const stateProps = { 'aria-busy': true, 'aria-label': title, 'data-skeleton-variant': variant } as const;
  const announcement = announce ? (
    <>
      <span className="sr-only" role="status">{title}</span>
      {slow ? (
        <p className="text-caption" style={{ color: 'var(--uo-route-text-tertiary)' }}>
          This is taking longer than expected.
        </p>
      ) : null}
    </>
  ) : null;

  if (!visible) {
    // The resource is already busy; only the bone geometry is delayed.
    return <div className={className} {...stateProps}>{announcement}</div>;
  }

  if (variant === 'shell') return <div className={cn('flex min-h-screen flex-col gap-4 p-4 sm:p-6', className)} {...stateProps}><Bone className="h-10 w-full" /><div className="flex gap-4"><Bone className="h-[calc(100vh-6rem)] w-56 shrink-0" /><div className="min-w-0 flex-1 space-y-4"><Bone className="h-8 w-56" /><Bone className="h-4 w-full max-w-xl" /><LoadingSkeleton variant="table" rows={rows} title={title} announce={false} delayMs={0} /></div></div>{announcement}</div>;
  if (variant === 'metric-group') return <div className={cn('ua-metric-group', className)} {...stateProps}>{Array.from({ length: 4 }, (_, index) => <div key={index} className="ua-metric-group__item space-y-2"><Bone className="h-3 w-20" /><Bone className="h-7 w-16" /><Bone className="h-3 w-28" /></div>)}{announcement}</div>;
  if (variant === 'table') return <div className={cn('overflow-hidden rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-default)]', className)} {...stateProps}><Bone className="h-[var(--uo-route-table-header-height)] w-full rounded-none" />{Array.from({ length: rows }, (_, index) => <div key={index} className="flex h-[var(--uo-route-table-row-height)] items-center gap-4 border-t border-[var(--uo-route-border-subtle)] px-4"><Bone className="h-4 w-32" /><Bone className="h-4 w-24" /><Bone className="h-4 w-16" /></div>)}{announcement}</div>;
  if (variant === 'drawer') return <div className={cn('space-y-4 p-4', className)} {...stateProps}><Bone className="h-6 w-48" /><Bone className="h-4 w-full" /><Bone className="h-24 w-full" /><Bone className="h-32 w-full" />{announcement}</div>;
  if (variant === 'form') return <div className={cn('space-y-4', className)} {...stateProps}>{Array.from({ length: Math.max(3, rows) }, (_, index) => <div key={index} className="space-y-2"><Bone className="h-3 w-28" /><Bone className="h-9 w-full" /></div>)}<Bone className="h-9 w-28" />{announcement}</div>;
  if (variant === 'chart') return <div className={cn('space-y-3 rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-default)] p-4', className)} {...stateProps}><Bone className="h-4 w-40" /><Bone className="h-48 w-full" />{announcement}</div>;
  if (variant === 'header') return <div className={cn('space-y-2 py-4', className)} {...stateProps}><Bone className="h-5 w-40" /><Bone className="h-3 w-full max-w-md" />{announcement}</div>;
  if (variant === 'panel') return <div className={cn('space-y-3 rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-default)] p-4', className)} {...stateProps}><Bone className="h-4 w-32" /><Bone className="h-3 w-full max-w-sm" /><Bone className="h-20 w-full" />{announcement}</div>;
  if (variant === 'detail') return <div className={cn('grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]', className)} {...stateProps}><div className="space-y-3">{Array.from({ length: Math.max(3, rows) }, (_, index) => <Bone key={index} className="h-20 w-full rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-surface-primary)]" />)}</div><Bone className="h-72 w-full rounded-[var(--uo-route-radius-surface)] border border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-surface-primary)]" />{announcement}</div>;
  return <div className={cn('space-y-5', className)} {...stateProps}><div className="space-y-2"><Bone className="h-7 w-48" /><Bone className="h-4 w-full max-w-xl" /></div><LoadingSkeleton variant="table" rows={rows} title={title} announce={false} delayMs={0} />{announcement}</div>;
}
