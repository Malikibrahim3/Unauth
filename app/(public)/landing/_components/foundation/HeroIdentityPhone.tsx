import { SlidersHorizontal, Info } from 'lucide-react';
import { FL_PHONE } from '../../_lib/foundationContent';
import styles from './foundation.module.css';

/**
 * Glass phone mockup floating over the dusk hero — an identity record
 * rendered in product-real terms (grade, signals, exposure, lookup time)
 * instead of a static screenshot. Pure HTML/CSS; the sparkline is a tiny
 * data polyline, not an illustration.
 */

function sparkPoints(values: readonly number[], w: number, h: number): string {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export default function HeroIdentityPhone() {
  return (
    <div className={`${styles.phoneIn} ${styles.phoneScale} relative mx-auto w-full max-w-[24rem]`}>
      {/* device bezel — distinct dark frame around the glass screen */}
      <div
        className="rounded-[3.1rem] bg-[var(--fl-bezel)] p-[7px]"
        style={{ boxShadow: 'var(--fl-shadow-phone)' }}
      >
        <div className="rounded-[2.65rem] border border-[var(--fl-glass-line)] bg-[var(--fl-glass-bg)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
        {/* speaker notch */}
        <div className="mx-auto mb-5 mt-1 h-2 w-20 rounded-full border border-[var(--fl-glass-line-faint)]" />

        {/* record header */}
        <div className="flex items-start justify-between px-1">
          <div>
            <p className="text-[1.0625rem] font-semibold leading-tight text-[var(--fl-dusk-ink)]">
              {FL_PHONE.title}
            </p>
            <p className="mt-0.5 font-mono text-[0.6875rem] text-[var(--fl-dusk-ink-dim)]">
              {FL_PHONE.subtitle}
            </p>
          </div>
          <div className="flex gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fl-glass-card)] text-[var(--fl-dusk-ink)]">
              <SlidersHorizontal size={13} aria-hidden />
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fl-glass-card)] text-[var(--fl-dusk-ink)]">
              <Info size={13} aria-hidden />
            </span>
          </div>
        </div>

        {/* exposure card */}
        <div className="mt-4 rounded-2xl border border-[var(--fl-glass-line-faint)] bg-[var(--fl-glass-card)] p-4 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[var(--fl-dusk-ink-dim)]">{FL_PHONE.valueLabel}</p>
              <p className="mt-1 text-[2rem] font-semibold leading-none tracking-normal text-[var(--fl-dusk-ink)]">
                {FL_PHONE.value}
              </p>
            </div>
            <svg
              viewBox="0 0 96 36"
              className="mt-1 h-9 w-24"
              aria-hidden
              role="presentation"
            >
              <polyline
                points={sparkPoints(FL_PHONE.spark, 96, 36)}
                fill="none"
                stroke="var(--fl-spark)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-2 divide-x divide-[var(--fl-glass-line-faint)]">
            <div className="pr-4">
              <p className="text-xs text-[var(--fl-dusk-ink-dim)]">{FL_PHONE.compareA.label}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--fl-dusk-ink)]">
                {FL_PHONE.compareA.value}
              </p>
              <p className="mt-1 font-mono text-[0.625rem] text-[var(--fl-dusk-ink-dim)]">
                {FL_PHONE.compareA.delta}
              </p>
            </div>
            <div className="pl-4">
              <p className="text-xs text-[var(--fl-dusk-ink-dim)]">{FL_PHONE.compareB.label}</p>
              <p className="mt-1 text-lg font-semibold text-[var(--fl-dusk-ink)]">
                {FL_PHONE.compareB.value}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[rgba(127,214,160,0.14)] px-1.5 py-0.5 font-mono text-[0.625rem] text-[var(--fl-up)]">
                {FL_PHONE.compareB.delta}
              </p>
            </div>
          </div>
        </div>

        {/* status + key/value rows */}
        <dl className="mt-4 px-1">
          <div className="flex items-center justify-between py-2">
            <dt className="text-[0.8125rem] text-[var(--fl-dusk-ink-dim)]">
              {FL_PHONE.status.label}
            </dt>
            <dd className="rounded-full bg-[var(--fl-status-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--fl-status-fg)]">
              {FL_PHONE.status.value}
            </dd>
          </div>
          {FL_PHONE.rows.map((row) => (
            <div
              key={row.k}
              className="flex items-center justify-between border-t border-[var(--fl-glass-line-faint)] py-2.5"
            >
              <dt className="text-[0.8125rem] text-[var(--fl-dusk-ink-dim)]">{row.k}</dt>
              <dd className="text-[0.8125rem] font-medium text-[var(--fl-dusk-ink)]">{row.v}</dd>
            </div>
          ))}
        </dl>
        </div>
      </div>
    </div>
  );
}
