import type { AuthChartTone } from '../types';
import styles from '../AuthenticatedCharts.module.css';
import meterStyles from './TickMeterRow.module.css';

type TickMeterRowProps = {
  label: string;
  /** 0–100 */
  percent: number;
  displayValue: string;
  tone: AuthChartTone;
  /** Interpretive caption. States interpretation, never a number. */
  caption?: string;
};

const TONE_FILL_VAR: Record<AuthChartTone, string> = {
  primary: '--ua-chart-1',
  positive: '--ua-chart-2',
  secondary: '--ua-chart-3',
  attention: '--ua-chart-4',
  negative: '--ua-chart-5',
  neutral: '--ua-chart-neutral',
};

/**
 * Progress / capacity meter (spec §8.3): one flat fill on a neutral track, with
 * the label and value always visible in text so the bar is never the only
 * carrier of the reading.
 */
export function TickMeterRow({ label, percent, displayValue, tone, caption }: TickMeterRowProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  // Attention and positive fills do not meet 4.5:1 as text, so the value stays
  // primary ink; the fill carries the tone.
  const valueColour = tone === 'negative' ? styles.toneTextNegative : '';

  return (
    <div>
      <div className={meterStyles.header}>
        <span className={meterStyles.label}>{label}</span>
        <span className={`${meterStyles.value} ${valueColour}`}>{displayValue}</span>
      </div>
      <div
        className={meterStyles.track}
        role="meter"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${label}: ${displayValue}`}
      >
        <div
          className={meterStyles.fill}
          style={{ width: `${clamped}%`, background: `var(${TONE_FILL_VAR[tone]})` }}
        />
      </div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
    </div>
  );
}
