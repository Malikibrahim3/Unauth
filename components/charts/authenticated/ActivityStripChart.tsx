import type { CSSProperties } from 'react';
import { formatNumber } from '@/lib/utils/format';
import { ChartLegend, ChartPanel, ChartState } from './ChartPanel';
import styles from './AuthenticatedCharts.module.css';

export type ActivityStripDay = { label: string; read: number; unread: number; dateLabel: string };

export function ActivityStripChart({ id, title, description, days }: { id: string; title: string; description: string; days: ActivityStripDay[] }) {
  const max = Math.max(0, ...days.map((day) => day.read + day.unread));
  const total = days.reduce((sum, day) => sum + day.read + day.unread, 0);
  return (
    <ChartPanel
      id={id}
      title={title}
      description={description}
      annotation={total > 0 ? <><strong>{formatNumber(total)}</strong>shown</> : undefined}
      legend={<ChartLegend items={[{ label: 'Unread', tone: 'orange' }, { label: 'Read', tone: 'blue' }]} />}
      kind="activity-strip"
      table={days.map((day) => ({ label: day.dateLabel, value: formatNumber(day.read + day.unread), detail: `${formatNumber(day.unread)} unread · ${formatNumber(day.read)} read` }))}
    >
      {total === 0 ? <ChartState title="No notification activity" description="No notification records are available in the displayed period." /> : (
        <div className={styles.activityChart} style={{ '--days': days.length } as CSSProperties} role="img" aria-label={days.map((day) => `${day.dateLabel}: ${day.unread} unread, ${day.read} read`).join(', ')}>
          {days.map((day) => {
            const dayTotal = day.read + day.unread;
            const height = max > 0 ? Math.max(2, (dayTotal / max) * 100) : 2;
            return <div className={styles.activityDay} key={day.dateLabel}>
              <div className={styles.activityStack} style={{ height: `${height}%` }}>
                {dayTotal > 0 ? <><span className={styles.activityUnread} style={{ height: `${(day.unread / dayTotal) * 100}%` }} /><span className={styles.activityRead} style={{ height: `${(day.read / dayTotal) * 100}%` }} /></> : null}
              </div>
              <span className={styles.activityLabel}>{day.label}</span>
            </div>;
          })}
        </div>
      )}
    </ChartPanel>
  );
}
