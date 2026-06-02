import type { CSSProperties } from 'react';
import AnimatedBar from '../AnimatedBar';
import TypedText from '../TypedText';
import { t } from '../../_tokens';
import {
  HERO_SUBJECT_FIELDS,
  heroSubjectRowDelay,
  heroMatchedDelay,
  heroNetworkDelay,
  heroActionDelay,
  heroFooterDelay,
} from '../../landingPageConstants';

export function LandingHeroCaseCardBody() {
  return (
<>
              {/* Two-column body: subject + sparkbars */}
              <div className="grid grid-cols-1 md:grid-cols-[1.18fr_0.82fr]">
                {/* Subject column */}
                <div style={{ padding: '12px 14px', borderRight: `1px solid ${t.border}` }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      color: t.inkTertiary,
                      marginBottom: '8px',
                    }}
                  >
                    SUBJECT
                  </p>
                  <p
                    className="ua-case-step"
                    style={{
                      fontFamily: 'var(--font-serif, serif)',
                      fontSize: '18px',
                      color: t.ink,
                      marginBottom: '4px',
                      lineHeight: 1.3,
                      ['--ua-case-delay' as string]: '120ms',
                      ['--ua-case-duration' as string]: '220ms',
                      ['--ua-case-steps' as string]: 14,
                      ['--ua-type-delay' as string]: '120ms',
                      ['--ua-type-duration' as string]: '260ms',
                      ['--ua-type-steps' as string]: 14,
                      ['--ua-type-width' as string]: '14ch',
                    } as CSSProperties}
                  >
                    <TypedText text="Noah K████" delay={120} speed={18} />
                    <sup>
                      <a href="#note-1" style={{ color: t.accent, textDecoration: 'none' }}>1</a>
                    </sup>
                  </p>
                  <p
                    className="ua-case-step"
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '12px',
                      color: t.accent,
                      letterSpacing: '0.02em',
                      marginBottom: '4px',
                      ['--ua-case-delay' as string]: '180ms',
                      ['--ua-case-duration' as string]: '180ms',
                      ['--ua-case-steps' as string]: 12,
                      ['--ua-type-delay' as string]: '220ms',
                      ['--ua-type-duration' as string]: '220ms',
                      ['--ua-type-steps' as string]: 13,
                      ['--ua-type-width' as string]: '14ch',
                    } as CSSProperties}
                  >
                    <TypedText text="→ #u_kessler.07" delay={260} speed={14} />
                  </p>
                  <p
                    className="ua-case-step"
                    style={{
                      fontFamily: 'var(--font-serif, serif)',
                      fontSize: '12px',
                      fontStyle: 'italic',
                      color: t.inkTertiary,
                      lineHeight: 1.45,
                      margin: '0 0 10px 0',
                      ['--ua-case-delay' as string]: '220ms',
                      ['--ua-case-duration' as string]: '300ms',
                      ['--ua-case-steps' as string]: 42,
                      ['--ua-type-delay' as string]: '340ms',
                      ['--ua-type-duration' as string]: '520ms',
                      ['--ua-type-steps' as string]: 58,
                      ['--ua-type-width' as string]: '58ch',
                    } as CSSProperties}
                  >
                    <TypedText text="Peer merchants anonymized · raw identifiers shown as hashes." delay={420} speed={9} />
                  </p>

                  {/* Identity fragment grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px 14px',
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '12px',
                      color: t.inkSecondary,
                    }}
                  >
                    {HERO_SUBJECT_FIELDS.map((field) => {
                      const previousRowCount = HERO_SUBJECT_FIELDS
                        .slice(0, HERO_SUBJECT_FIELDS.findIndex((item) => item.label === field.label))
                        .reduce((count, item) => count + item.rows.length, 0);

                      return (
                      <div key={field.label}>
                        <span
                          className="ua-case-step"
                          style={{
                            color: t.inkTertiary,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            fontSize: '12px',
                            display: 'block',
                            marginBottom: '4px',
                            ['--ua-case-delay' as string]: heroSubjectRowDelay(previousRowCount),
                            ['--ua-case-duration' as string]: '90ms',
                            ['--ua-case-steps' as string]: 8,
                            ['--ua-type-delay' as string]: heroSubjectRowDelay(previousRowCount),
                            ['--ua-type-duration' as string]: '120ms',
                            ['--ua-type-steps' as string]: 9,
                            ['--ua-type-width' as string]: '10ch',
                          } as CSSProperties}
                        >
                          <TypedText text={field.label} delay={220 + previousRowCount * 58} speed={12} />
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {field.rows.map(([value, note], rowIndex) => (
                            <div
                              key={`${field.label}-${value}`}
                              className="ua-case-step"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: note ? 'minmax(0, 1fr) auto' : '1fr',
                                gap: '8px',
                                alignItems: 'baseline',
                                ['--ua-case-delay' as string]: heroSubjectRowDelay(previousRowCount + rowIndex),
                                ['--ua-case-duration' as string]: `${Math.min(360, Math.max(160, value.length * 10))}ms`,
                                ['--ua-case-steps' as string]: Math.min(34, Math.max(12, value.length)),
                              } as CSSProperties}
                            >
                              <TypedText
                                text={value}
                                delay={220 + (previousRowCount + rowIndex) * 58}
                                speed={12}
                                style={{
                                  color: t.ink,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              />
                              {note ? (
                                <TypedText
                                  text={note}
                                  delay={350 + (previousRowCount + rowIndex) * 58}
                                  speed={13}
                                  style={{
                                    color: t.inkTertiary,
                                    fontSize: '12px',
                                    textAlign: 'right',
                                    whiteSpace: 'nowrap',
                                  }}
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Risk score column */}
                <div style={{ padding: '12px 14px' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      color: t.inkTertiary,
                      marginBottom: '8px',
                    }}
                  >
                    SIGNALS FIRED - 8 / 12
                  </p>
                  <div className="ua-landing-case-signal-list">
                    {[
                      { l: 'refund_rate_over_60pct', v: 0.92, on: true },
                      { l: 'cross_merchant_inr_pattern', v: 0.88, on: true },
                      { l: 'shipping_address_variant', v: 0.74, on: true },
                      { l: 'denial_then_chargeback', v: 0.68, on: true },
                      { l: 'payment_fingerprint_match', v: 0.64, on: true },
                      { l: 'address_normalization_match', v: 0.58, on: true },
                      { l: 'device_reuse_observed', v: 0.51, on: true },
                      { l: 'velocity_burst_24h', v: 0.21, on: false },
                    ].map(({ l, v, on }, i) => (
                      <div key={l} className="ua-case-row-hover ua-landing-case-signal-row">
                        <div>
                          <div className="ua-landing-case-signal-label-row">
                            <span
                              className={on ? 'ua-landing-case-signal-dot ua-landing-case-signal-dot--on' : 'ua-landing-case-signal-dot ua-landing-case-signal-dot--off'}
                            />
                            <TypedText
                              text={l}
                              delay={260 + i * 58}
                              speed={10}
                              className={on ? 'ua-landing-case-signal-text--on' : 'ua-landing-case-signal-text--off'}
                            />
                          </div>
                          <AnimatedBar
                            className="ua-case-signal-bar"
                            value={v}
                            color={on ? t.accent : t.border}
                            track={t.border}
                            height={3}
                            delay={520 + i * 130}
                            duration={1050}
                            transitionWidth
                            waitForVisibility
                          />
                        </div>
                        <span
                          className={`ua-case-score ${on ? 'ua-landing-case-score--on' : 'ua-landing-case-score--off'}`}
                          style={{ ['--ua-case-score-delay' as string]: `${1500 + i * 130}ms` }}
                        >
                          <TypedText text={v.toFixed(2)} delay={1500 + i * 130} speed={28} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
</>
  );
}
