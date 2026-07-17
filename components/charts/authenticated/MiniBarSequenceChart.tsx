import type { CSSProperties } from 'react';
import { formatNumber } from '@/lib/utils/format';
import { ChartLegend, ChartPanel, ChartState } from './ChartPanel';
import { finiteNonNegative, type AuthChartDatum } from './types';
import styles from './AuthenticatedCharts.module.css';

export function MiniBarSequenceChart({ id, title, description, items }: { id: string; title: string; description: string; items: AuthChartDatum[] }) {
  const rows = items.slice(0, 18).map((item) => ({ ...item, value: finiteNonNegative(item.value) }));
  const max = Math.max(0, ...rows.map((row) => row.value));
  const legend = [...new Map(rows.map((row) => [row.tone ?? 'neutral', { label: row.detail ?? row.tone ?? 'Other', tone: row.tone ?? 'neutral' }])).values()];
  return (
    <ChartPanel id={id} title={title} description={description} legend={<ChartLegend items={legend} />} kind="mini-bar-sequence" table={rows.map((row) => ({ label: row.label, value: formatNumber(row.value), detail: row.detail }))}>
      {rows.length === 0 ? <ChartState title="No configured flows" description="Create a flow family before action load can be shown." /> : (
        <div className={styles.sequence} style={{ '--bars': rows.length } as CSSProperties} role="img" aria-label={rows.map((row) => `${row.label}: ${row.value} actions, ${row.detail ?? ''}`).join(', ')}>
          {rows.map((row) => <div className={styles.sequenceItem} key={row.label} title={`${row.label}: ${row.value} actions`}>
            <div className={`${styles.sequenceBar} ${styles[row.tone ?? 'neutral']}`} style={{ height: row.value > 0 && max > 0 ? `${Math.max(5, (row.value / max) * 100)}%` : '0%' }} />
            <span className={styles.sequenceLabel}>{row.label}</span>
          </div>)}
        </div>
      )}
    </ChartPanel>
  );
}
