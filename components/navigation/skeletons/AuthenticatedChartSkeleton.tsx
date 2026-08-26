import { Bone } from './primitives';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

/**
 * Skeleton variant set mirrors the T1–T10 primitive roster 1:1 — each variant's
 * markup approximates its primitive's exact geometry from
 * components/charts/authenticated/core/geometry.ts so there is no layout shift on resolve.
 */
export type AuthChartSkeletonVariant =
  | 'trend'
  | 'combo'
  | 'rail'
  | 'meter'
  | 'matrix'
  | 'segment'
  | 'ranked'
  | 'columns'
  | 'bands'
  | 'dotplot'
  | 'sequence'
  | 'sparkline'
  | 'health';

const widths = ['100%', '76%', '58%', '42%', '28%'];

export function AuthenticatedChartSkeleton({ variant }: { variant: AuthChartSkeletonVariant }) {
  return (
    <section className={styles.panel} data-chart-skeleton={variant}>
      <div className={styles.panelHeader}>
        <div className="space-y-1.5"><Bone className="h-3 w-36" /><Bone className="h-2.5 w-72 max-w-full" /></div>
        <Bone className="h-5 w-20" />
      </div>
      <div className="min-h-[170px] p-4">
        {variant === 'bands' || variant === 'ranked' ? (
          <div className="space-y-3">
            {widths.map((width) => <div key={width} className="grid grid-cols-[90px_minmax(0,1fr)_32px] items-center gap-3"><Bone className="h-3 w-20" /><Bone className="h-3" style={{ width }} /><Bone className="h-3 w-7" /></div>)}
          </div>
        ) : null}
        {variant === 'columns' ? (
          <div className="flex h-[145px] items-end justify-around gap-3 border-b border-[var(--uo-route-border-subtle)] px-3">
            {[48, 82, 58, 100, 68].map((height, index) => <div key={`${height}-${index}`} className="flex h-full flex-1 items-end justify-center"><Bone className="w-6 rounded-b-none rounded-t-[var(--uo-route-radius-xs)]" style={{ height: `${height}%` }} /></div>)}
          </div>
        ) : null}
        {variant === 'combo' || variant === 'trend' ? (
          <div className="relative flex h-[160px] items-end justify-around gap-3 border-b border-[var(--uo-route-border-subtle)] px-3 pt-3">
            {[48, 82, 58, 100, 68, 42, 76].map((height, index) => <div key={`${height}-${index}`} className="flex h-full flex-1 items-end justify-center"><Bone className="w-5 rounded-b-none rounded-t-[var(--uo-route-radius-xs)]" style={{ height: `${height}%` }} /></div>)}
            <Bone className="pointer-events-none absolute inset-x-3 top-8 h-px" />
          </div>
        ) : null}
        {variant === 'rail' ? (
          <div className="space-y-4 py-2">
            <Bone className="h-9 w-full rounded-[var(--uo-route-radius-control)]" />
            <div className="flex gap-3">{widths.slice(0, 3).map((width) => <Bone key={width} className="h-3 w-16" style={{ width }} />)}</div>
          </div>
        ) : null}
        {variant === 'meter' ? (
          <div className="space-y-4 py-1">
            {[0, 1, 2].map((row) => (
              <div key={row} className="space-y-1.5">
                <div className="flex items-center justify-between"><Bone className="h-3 w-24" /><Bone className="h-3 w-10" /></div>
                <Bone className="h-3.5 w-full rounded-[var(--uo-route-radius-xs)]" />
              </div>
            ))}
          </div>
        ) : null}
        {variant === 'dotplot' ? (
          <div className="space-y-5 py-3">{['64%', '42%', '28%'].map((width) => <div key={width} className="grid grid-cols-[110px_1fr_36px] items-center gap-3"><Bone className="h-3 w-24" /><div className="relative border-b border-[var(--uo-route-border-subtle)]"><Bone className="h-0.5" style={{ width }} /><Bone className="absolute -bottom-1 h-2 w-2 rounded-full" style={{ left: width }} /></div><Bone className="h-3 w-8" /></div>)}</div>
        ) : null}
        {variant === 'matrix' ? (
          <div className="grid grid-cols-[repeat(13,7px)] gap-0.5">{Array.from({ length: 91 }, (_, index) => <Bone key={index} className="h-[7px] w-[7px] rounded-[var(--uo-route-radius-xs)]" />)}</div>
        ) : null}
        {variant === 'segment' ? (
          <div className="space-y-4 py-1">
            <Bone className="h-2.5 w-full rounded-full" />
            <div className="flex gap-4">{[0, 1, 2].map((i) => <Bone key={i} className="h-3 w-16" />)}</div>
            <div className="space-y-2 pt-2">{widths.slice(0, 3).map((w) => <div key={w} className="flex items-center justify-between"><Bone className="h-3 w-28" /><Bone className="h-3 w-10" /></div>)}</div>
          </div>
        ) : null}
        {variant === 'sequence' ? (
          <div className="flex h-[145px] items-end gap-2 border-b border-[var(--uo-route-border-subtle)]">{[40, 65, 32, 88, 54, 76, 30, 98, 62, 46, 70, 35].map((height, index) => <Bone key={`${height}-${index}`} className="min-w-3 flex-1 rounded-b-none rounded-t-[var(--uo-route-radius-xs)]" style={{ height: `${height}%` }} />)}</div>
        ) : null}
        {variant === 'sparkline' ? (
          <Bone className="h-5 w-[60px] rounded-[var(--uo-route-radius-xs)]" />
        ) : null}
        {variant === 'health' ? (
          <div className="grid grid-cols-[140px_repeat(3,minmax(70px,1fr))] gap-px overflow-hidden rounded-sm bg-[var(--uo-route-border-subtle)]">{Array.from({ length: 20 }, (_, index) => <div key={index} className="bg-[var(--uo-route-surface-primary)] p-2"><Bone className="h-4 w-full" /></div>)}</div>
        ) : null}
      </div>
      <div className="border-t border-[var(--uo-route-border-subtle)] px-4 py-2"><Bone className="h-2.5 w-24" /></div>
    </section>
  );
}
