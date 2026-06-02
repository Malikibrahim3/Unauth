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

export function LandingHeroCaseCardFooter() {
  return (
<>
              {/* Tracked datapoints */}
              <div style={{ borderTop: `1px solid ${t.border}`, padding: '10px 14px' }}>
                <p
                  className="ua-case-step"
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '12px',
                    letterSpacing: '0.02em',
                    color: t.inkSecondary,
                    margin: 0,
                    lineHeight: 1.6,
                    ['--ua-case-delay' as string]: `${heroMatchedDelay}ms`,
                    ['--ua-case-duration' as string]: '520ms',
                    ['--ua-case-steps' as string]: 58,
                    ['--ua-type-delay' as string]: `${heroMatchedDelay}ms`,
                    ['--ua-type-duration' as string]: '760ms',
                    ['--ua-type-steps' as string]: 72,
                    ['--ua-type-width' as string]: '92ch',
                  } as CSSProperties}
                >
                  <TypedText text="MATCHED · email · phone · address · card · ip · device · browser · asn · INR · 13.1" delay={heroMatchedDelay} speed={10} />
                </p>
              </div>

              {/* Network footprint */}
              <div style={{ borderTop: `1px solid ${t.border}`, padding: '14px 16px', background: t.bg }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '10px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-sans, sans-serif)',
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      color: t.inkTertiary,
                      margin: 0,
                    }}
                  >
                    NETWORK FOOTPRINT
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-dm-mono, monospace)',
                      fontSize: '12px',
                      letterSpacing: '0.02em',
                      color: t.inkTertiary,
                      margin: 0,
                    }}
                  >
                    7 merchants · aggregate only · 11 orders
                  </p>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '12px',
                    color: t.inkSecondary,
                    lineHeight: 1.65,
                  }}
                >
                  {[
                    { m: 'your_store',  o: '3 ord · 2 ref',  v: '$340',   r: 0.55 },
                    { m: 'merchant_04', o: '3 ord · 2 INR',  v: '$1,210', r: 0.92, note: true },
                    { m: 'merchant_02', o: '2 ord · 2 INR',  v: '$613',   r: 0.80 },
                    { m: 'merchant_03', o: '2 ord · 1 INR',  v: '$890',   r: 0.71 },
                  ].map((row, i) => (
                    <div
                      key={row.m}
                      className="ua-case-step ua-case-row-hover"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr) 54px auto',
                          gap: '12px',
                          alignItems: 'center',
                          paddingTop: '3px',
                          paddingBottom: '3px',
                          margin: '0 -4px',
                          paddingLeft: '4px',
                          paddingRight: '4px',
                        borderTop: i > 0 ? '1px solid rgba(123,45,38,0.08)' : 'none',
                        transition: 'background 140ms ease',
                        ['--ua-case-delay' as string]: `${heroNetworkDelay + i * 60}ms`,
                        ['--ua-case-duration' as string]: '260ms',
                        ['--ua-case-steps' as string]: 24,
                        ['--ua-type-delay' as string]: `${heroNetworkDelay + i * 80}ms`,
                        ['--ua-type-duration' as string]: '420ms',
                        ['--ua-type-steps' as string]: 34,
                        ['--ua-type-width' as string]: '62ch',
                      } as CSSProperties}
                    >
                      <TypedText
                        text={row.note ? `${row.m}²` : row.m}
                        delay={heroNetworkDelay + i * 80}
                        speed={12}
                        style={{ color: t.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      />
                      <TypedText text={row.o} delay={heroNetworkDelay + i * 80 + 120} speed={13} style={{ color: t.inkSecondary }} />
                      <AnimatedBar
                        value={row.r}
                        color={row.r > 0.7 ? t.accent : row.r > 0.5 ? t.accent : t.inkTertiary}
                        track={t.border}
                        height={3}
                        delay={500 + i * 70}
                      />
                      <TypedText text={row.v} delay={heroNetworkDelay + i * 80 + 220} speed={20} style={{ color: t.ink, fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: '46px' }} />
                    </div>
                  ))}
                  <p style={{ color: t.inkTertiary, fontSize: '12px', marginTop: '6px' }}>
                    + 3 more merchants withheld
                  </p>
                </div>
              </div>

              {/* Signal summary */}
              <div
                className="ua-case-step"
                style={{
                  borderTop: `1px solid ${t.border}`,
                  padding: '14px 22px',
                  background: `linear-gradient(90deg, ${t.surfacePink} 0%, ${t.surfacePink2} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  ['--ua-case-delay' as string]: `${heroActionDelay}ms`,
                  ['--ua-case-duration' as string]: '320ms',
                  ['--ua-case-steps' as string]: 36,
                  ['--ua-type-delay' as string]: `${heroActionDelay}ms`,
                  ['--ua-type-duration' as string]: '620ms',
                  ['--ua-type-steps' as string]: 64,
                  ['--ua-type-width' as string]: '92ch',
                } as CSSProperties}
                >
                  <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '12px',
                    color: t.accent,
                    letterSpacing: '0.02em',
                    margin: 0,
                    fontWeight: 500,
                  }}
                  >
                  <TypedText text="▸ SIGNAL PATTERN DETECTED · COMPILE SIGNAL DATA FOR 2 OPEN DISPUTES" delay={heroActionDelay} speed={10} />
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '12px',
                    color: t.accent,
                    background: t.paper,
                    border: `1px solid ${t.borderWarm}`,
                    padding: '2px 8px',
                  }}
                >
                  <TypedText text="packet.pdf · 2.4mb" delay={heroActionDelay + 460} speed={14} />
                </span>
              </div>

              {/* Footer meta */}
              <div
                className="ua-case-step"
                style={{
                  borderTop: `1px solid ${t.border}`,
                  padding: '10px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  ['--ua-case-delay' as string]: `${heroFooterDelay}ms`,
                  ['--ua-case-duration' as string]: '280ms',
                  ['--ua-case-steps' as string]: 36,
                  ['--ua-type-delay' as string]: `${heroFooterDelay}ms`,
                  ['--ua-type-duration' as string]: '520ms',
                  ['--ua-type-steps' as string]: 62,
                  ['--ua-type-width' as string]: '96ch',
                } as CSSProperties}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '12px',
                    color: t.inkTertiary,
                    letterSpacing: '0.02em',
                    margin: 0,
                  }}
                >
                  <TypedText text="generated 2026-05-15 09:42 EST · pipeline latency 38ms" delay={heroFooterDelay} speed={10} />
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '12px',
                    color: t.inkTertiary,
                    margin: 0,
                  }}
                >
                  <TypedText text="HMAC-SHA256 · per-tenant salt" delay={heroFooterDelay + 360} speed={12} />
                </p>
              </div>
    </>
  );
}
