import type { AuthChartTone } from '../types';
import styles from '../AuthenticatedCharts.module.css';
import tickStyles from './TickMeterRow.module.css';
import { TICK_COUNT_MAX } from '../core/geometry';

type TickMeterRowProps = {
  label: string;
  /** 0–100 */
  percent: number;
  displayValue: string;
  tone: AuthChartTone;
  /** Interpretive caption — the one audited italic in the product. States interpretation, never a number. */
  caption?: string;
  tickCount?: number;
};

/** T7 — tick meter ("barcode" meter). Metric rows with a dense row of vertical ticks. */
export function TickMeterRow({ label, percent, displayValue, tone, caption, tickCount = TICK_COUNT_MAX }: TickMeterRowProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * tickCount);
  // Orange and yellow fail 4.5:1 as text — fall back to --text-primary per §1 T7.
  const TONE_TEXT_CLASS: Record<AuthChartTone, string> = {
    orange: '', yellow: '',
    blue: styles.toneTextBlue, green: styles.toneTextGreen,
    red: styles.toneTextRed, violet: styles.toneTextViolet, neutral: styles.toneTextNeutral,
  };
  const valueColour = TONE_TEXT_CLASS[tone];

  return (
    <div>
      <div className={tickStyles.header}>
        <span className={tickStyles.label}>{label}</span>
        <span className={`${tickStyles.value} ${styles.mono} ${valueColour ?? ''}`}>{displayValue}</span>
      </div>
      <div className={tickStyles.row} role="img" aria-label={`${label}: ${displayValue}`}>
        {Array.from({ length: tickCount }, (_, index) => (
          <span key={index} className={index < filled ? styles[tone] : tickStyles.tickEmpty} />
        ))}
      </div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
    </div>
  );
}
