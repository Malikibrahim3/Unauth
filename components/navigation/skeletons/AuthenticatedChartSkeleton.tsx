import { Bone } from './primitives';
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

export type AuthChartSkeletonVariant =
  | 'deadline'
  | 'columns'
  | 'ranked'
  | 'funnel'
  | 'range'
  | 'matrix'
  | 'sequence'
  | 'health'
  | 'activity';

const widths = ['100%', '76%', '58%', '42%', '28%'];

export function AuthenticatedChartSkeleton({ variant }: { variant: AuthChartSkeletonVariant }) {
  return (
    <section className={styles.panel} data-chart-skeleton={variant}>
      <div className={styles.panelHeader}>
        <div className="space-y-1.5"><Bone className="h-3 w-36" /><Bone className="h-2.5 w-72 max-w-full" /></div>
        <Bone className="h-5 w-20" />
      </div>
      <div className="min-h-[170px] p-4">
        {variant === 'deadline' || variant === 'ranked' ? (
          <div className="space-y-3">
            {widths.map((width) => <div key={width} className="grid grid-cols-[90px_minmax(0,1fr)_32px] items-center gap-3"><Bone className="h-3 w-20" /><Bone className="h-3" style={{ width }} /><Bone className="h-3 w-7" /></div>)}
          </div>
        ) : null}
        {variant === 'columns' || variant === 'activity' ? (
          <div className="flex h-[145px] items-end justify-around gap-3 border-b border-[var(--border-muted)] px-3">
            {[48, 82, 58, 100, 68, 42, 76].slice(0, variant === 'columns' ? 5 : 7).map((height, index) => <div key={`${height}-${index}`} className="flex h-full flex-1 items-end justify-center"><Bone className="w-7 rounded-b-none" style={{ height: `${height}%` }} /></div>)}
          </div>
        ) : null}
        {variant === 'funnel' ? (
          <div className="mx-auto grid max-w-2xl gap-2 py-1">{widths.slice(0, 4).map((width) => <div key={width} className="grid grid-cols-[90px_1fr_32px] items-center gap-3"><Bone className="h-3 w-20" /><Bone className="mx-auto h-7" style={{ width }} /><Bone className="h-3 w-7" /></div>)}</div>
        ) : null}
        {variant === 'range' ? (
          <div className="space-y-5 py-3">{['64%', '42%', '28%'].map((width) => <div key={width} className="grid grid-cols-[110px_1fr_36px] items-center gap-3"><Bone className="h-3 w-24" /><div className="relative border-b border-[var(--border-muted)]"><Bone className="h-0.5" style={{ width }} /><Bone className="absolute -bottom-1 h-2 w-2 rounded-full" style={{ left: width }} /></div><Bone className="h-3 w-8" /></div>)}</div>
        ) : null}
        {variant === 'matrix' ? (
          <div className="grid grid-cols-12 gap-1">{Array.from({ length: 36 }, (_, index) => <Bone key={index} className="h-7 w-full rounded-sm" />)}</div>
        ) : null}
        {variant === 'sequence' ? (
          <div className="flex h-[145px] items-end gap-2 border-b border-[var(--border-muted)]">{[40, 65, 32, 88, 54, 76, 30, 98, 62, 46, 70, 35].map((height, index) => <Bone key={`${height}-${index}`} className="min-w-3 flex-1 rounded-b-none" style={{ height: `${height}%` }} />)}</div>
        ) : null}
        {variant === 'health' ? (
          <div className="grid grid-cols-[140px_repeat(3,minmax(70px,1fr))] gap-px overflow-hidden rounded-sm bg-[var(--border-muted)]">{Array.from({ length: 20 }, (_, index) => <div key={index} className="bg-[var(--surface)] p-2"><Bone className="h-4 w-full" /></div>)}</div>
        ) : null}
      </div>
      <div className="border-t border-[var(--border-muted)] px-4 py-2"><Bone className="h-2.5 w-24" /></div>
    </section>
  );
}
