import { formatNumber } from '@/lib/utils/format';
import { ChartLegend, ChartPanel, ChartState } from './ChartPanel';
import type { AuthChartTone } from './types';
import styles from './AuthenticatedCharts.module.css';

export type StatusMatrixItem = { label: string; tone: AuthChartTone; detail: string };

export function StatusMatrixChart({
  id,
  title,
  description,
  items,
  summary,
}: {
  id: string;
  title: string;
  description: string;
  items: StatusMatrixItem[];
  summary: Array<{ label: string; value: number; tone: AuthChartTone }>;
}) {
  return (
    <ChartPanel
      id={id}
      title={title}
      description={description}
      annotation={items.length > 0 ? <><strong>{formatNumber(items.length)}</strong>rule families</> : undefined}
      legend={<ChartLegend items={summary.map((item) => ({ label: item.label, tone: item.tone }))} />}
      kind="status-matrix"
      table={summary.map((item) => ({ label: item.label, value: formatNumber(item.value), detail: `${item.value} of ${items.length} rule families` }))}
      compact
    >
      {items.length === 0 ? <ChartState title="No configured rules" description="Create a rule family before lifecycle coverage can be shown." /> : (
        <>
          <div className={styles.statusMatrix} role="img" aria-label={summary.map((item) => `${item.label}: ${item.value}`).join(', ')}>
            {items.slice(0, 48).map((item, index) => <span key={`${item.label}-${index}`} className={`${styles.statusCell} ${styles[item.tone]}`} title={`${item.label}: ${item.detail}`}><span className="sr-only">{item.label}: {item.detail}</span></span>)}
          </div>
          <div className={styles.matrixKey}>
            {summary.map((item) => <div key={item.label}><span>{item.label}</span><strong>{formatNumber(item.value)}</strong></div>)}
          </div>
        </>
      )}
    </ChartPanel>
  );
}
