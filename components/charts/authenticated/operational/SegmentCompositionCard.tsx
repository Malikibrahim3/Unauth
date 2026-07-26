import Link from 'next/link';
import type { AuthChartTone } from '../types';
import styles from '../AuthenticatedCharts.module.css';

export type SegmentCompositionSegment = {
  key: string;
  label: string;
  value: number;
  tone: AuthChartTone;
  href?: string;
};

export type SegmentCompositionRow = {
  key: string;
  label: string;
  displayValue: string;
  deltaLabel?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  href?: string;
};

type SegmentCompositionCardProps = {
  segments: SegmentCompositionSegment[];
  headline?: { value: string; delta?: string };
  rows?: SegmentCompositionRow[];
};

/** T8 — segment bar + dot legend + ranked rows. The "Workflow breakdown" composition card. */
export function SegmentCompositionCard({ segments, headline, rows }: SegmentCompositionCardProps) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  return (
    <div>
      {headline ? (
        <div className={styles.segmentHeadline}>
          <strong className={styles.mono}>{headline.value}</strong>
          {headline.delta ? <span style={{ color: 'var(--ua-text-tertiary)', fontSize: 12 }}>{headline.delta}</span> : null}
        </div>
      ) : null}

      <div className={styles.segmentBar} role="img" aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        {segments.map((segment) => {
          const width = total > 0 ? Math.max(4, (segment.value / total) * 100) : 0;
          const body = <span className={styles[segment.tone]} style={{ display: 'block', width: '100%', height: '100%', borderRadius: 'var(--ua-radius-control)' }} />;
          return (
            <div key={segment.key} className={styles.segmentSeg} style={{ width: `${width}%`, background: 'transparent' }}>
              {segment.href ? (
                <Link href={segment.href} aria-label={`Open ${segment.label} — ${segment.value}`}>
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          );
        })}
      </div>

      <ul className={styles.dotLegend} aria-label="Segment legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <i className={styles[segment.tone]} aria-hidden="true" />
            {segment.label}
          </li>
        ))}
      </ul>

      {rows?.length ? (
        <div className={styles.rankedList}>
          {rows.map((row) => (
            <div key={row.key} className={styles.rankedListRow}>
              {row.href ? <Link href={row.href}>{row.label}</Link> : <span>{row.label}</span>}
              <span className={styles.rankedListValue}>
                <span className={styles.mono}>{row.displayValue}</span>
                {row.deltaLabel ? (
                  <span
                    style={{
                      color:
                        row.deltaTone === 'positive'
                          ? 'var(--ua-risk-low)'
                          : row.deltaTone === 'negative'
                            ? 'var(--ua-risk-critical)'
                            : 'var(--ua-text-secondary)',
                      fontSize: 12,
                    }}
                  >
                    {row.deltaLabel}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
