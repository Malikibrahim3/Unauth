import { UnauthLogo } from '@/components/ui/UnauthLogo';
import Reveal from '../Reveal';
import { COMPARISON_COLUMNS, COMPARISON_ROWS } from '../../landingPageConstants';
import { LandingComparisonIndicator } from './LandingComparisonIndicator';

const MOBILE_MATRIX_COLS = [
  { label: 'Lists', key: 'a' as const, highlight: false },
  { label: 'Scoring', key: 'b' as const, highlight: false },
  { label: 'Unauth', key: 'c' as const, highlight: true },
] as const;

export function LandingComparisonSection() {
  return (
    <>
      <section className="ua-section-flow mx-auto max-w-[1400px] px-6 md:px-10 pt-16 md:pt-20 pb-12 md:pb-16" suppressHydrationWarning>

        <Reveal delay={40} className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-12 items-start lg:items-center mb-6">
          <div>
            <p className="ua-landing-comparison-eyebrow">
              § 5 - HOW UNAUTH COMPARES
            </p>
            <h2 className="ua-landing-comparison-title">
              Checkout tools miss what happens after.
            </h2>
          </div>
          <p className="ua-landing-comparison-lead">
            Unauth finds refund abuse, friendly fraud, and INR cycles after the transaction clears.
          </p>
        </Reveal>

        <Reveal delay={120} className="hidden sm:block ua-glass-card ua-hover-glow ua-landing-comparison-card">
          <div className="ua-landing-comparison-desktop-header grid grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="ua-landing-comparison-desktop-cap-cell">
              <div className="ua-landing-comparison-desktop-cap-inner">
                <span className="ua-landing-comparison-cap-label">Capability</span>
                <div className="ua-landing-comparison-legend">
                  <span className="ua-landing-comparison-legend-item">
                    <LandingComparisonIndicator value="yes" highlight />
                    Included
                  </span>
                  <span className="ua-landing-comparison-legend-item">
                    <LandingComparisonIndicator value="partial" />
                    Partial
                  </span>
                  <span className="ua-landing-comparison-legend-item">
                    <LandingComparisonIndicator value="no" />
                    Not included
                  </span>
                </div>
              </div>
            </div>
            {COMPARISON_COLUMNS.map((col) => (
              <div
                key={col.name}
                className={col.highlight ? 'ua-landing-comparison-col-head ua-landing-comparison-col-head--highlight' : 'ua-landing-comparison-col-head'}
              >
                {col.logo ? (
                  <div className="ua-landing-comparison-logo-wrap">
                    <UnauthLogo className="h-[16px] w-auto" />
                  </div>
                ) : (
                  <p className={col.highlight ? 'ua-landing-comparison-col-name ua-landing-comparison-col-name--highlight' : 'ua-landing-comparison-col-name'}>
                    {col.name}
                  </p>
                )}
                <p className="ua-landing-comparison-col-sub">{col.sub}</p>
              </div>
            ))}
          </div>
          {COMPARISON_ROWS.map(({ cap, a, b, c, note }, i) => (
            <Reveal
              key={cap}
              delay={60 + i * 50}
              className="ua-landing-comparison-body-row grid grid-cols-[1.6fr_1fr_1fr_1fr]"
            >
              <div className="ua-landing-comparison-cap-cell">
                <p className="ua-landing-comparison-cap-title">{cap}</p>
                <p className="ua-landing-comparison-cap-note">{note}</p>
              </div>
              <div className="ua-landing-comparison-value-cell">
                <LandingComparisonIndicator value={a} />
              </div>
              <div className="ua-landing-comparison-value-cell">
                <LandingComparisonIndicator value={b} />
              </div>
              <div className="ua-landing-comparison-value-cell ua-landing-comparison-value-cell--highlight">
                <LandingComparisonIndicator value={c} highlight />
              </div>
            </Reveal>
          ))}
        </Reveal>

        <Reveal delay={120} className="sm:hidden ua-glass-card ua-hover-glow ua-landing-mobile-matrix">
          <div className="ua-landing-mobile-matrix-legend">
            <span className="ua-landing-comparison-legend-item">
              <LandingComparisonIndicator value="yes" highlight />
              Included
            </span>
            <span className="ua-landing-comparison-legend-item">
              <LandingComparisonIndicator value="partial" />
              Partial
            </span>
            <span className="ua-landing-comparison-legend-item">
              <LandingComparisonIndicator value="no" />
              Not included
            </span>
          </div>
          {COMPARISON_ROWS.map(({ cap, a, b, c, note }, i) => (
            <Reveal
              key={`m-${cap}`}
              delay={60 + i * 50}
              className={i < COMPARISON_ROWS.length - 1 ? 'ua-landing-mobile-matrix-row ua-landing-mobile-matrix-row--bordered' : 'ua-landing-mobile-matrix-row'}
            >
              <p className="ua-landing-comparison-mobile-cap">{cap}</p>
              <p className="ua-landing-comparison-mobile-note">{note}</p>
              <div className="ua-landing-comparison-mobile-grid">
                {MOBILE_MATRIX_COLS.map(({ label, key, highlight }) => (
                  <div
                    key={label}
                    className={highlight ? 'ua-landing-mobile-matrix-cell ua-landing-mobile-matrix-cell--highlight' : 'ua-landing-mobile-matrix-cell ua-landing-mobile-matrix-cell--default'}
                  >
                    <LandingComparisonIndicator value={key === 'a' ? a : key === 'b' ? b : c} highlight={highlight} />
                    <span className={highlight ? 'ua-landing-comparison-mobile-label ua-landing-comparison-mobile-label--highlight' : 'ua-landing-comparison-mobile-label'}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </Reveal>
          ))}
        </Reveal>
      </section>

    </>
  );
}
