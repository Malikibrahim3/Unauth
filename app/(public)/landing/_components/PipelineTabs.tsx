'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../_tokens';

const DWELL = 5200;
type TabId = 0 | 1 | 2 | 3;

const STEPS = [
  {
    n: '01', label: 'Upload', timing: '11ms',
    stat: '11', unit: 'ms',
    headline: 'No schema changes. No checkout work.',
    body: 'Upload your existing order, refund, and return exports as CSV. No schema changes, no developer, no checkout work — if you can export a report, you can run an audit.',
    screenshot: '/screenshots/pipeline-upload-cohesive.png',
    alt: 'Unauth New Audit — Upload CSV step with file drop zone, max file 200 MB, max rows 500k, Map → Process flow',
  },
  {
    n: '02', label: 'Hash', timing: '4ms',
    stat: 'k-safe', unit: 'network signals',
    headline: 'Sensitive fields are minimised for matching.',
    body: 'Email, phone, address, and card references are normalised into HMAC-SHA256 matching keys before cross-merchant graph comparison.',
    screenshot: '/screenshots/hash-demo.png',
    alt: 'Unauth Hash Demo — Privacy Boundary Active banner and table of rows with email and phone replaced by HMAC tokens',
  },
  {
    n: '03', label: 'Resolve', timing: '17ms',
    stat: '6', unit: 'merchants in cluster',
    headline: 'Cross-merchant clusters surface in milliseconds.',
    body: 'Hashed signals resolve against the cross-merchant identity graph. Only patterns confirmed across three or more merchants surface as evidence — everything else is filtered out.',
    screenshot: '/screenshots/inbox.png',
    alt: 'Unauth Inbox · Cases — identity-matched cases queue with cross-merchant identity match signals, confidence grades, values, and dates',
  },
  {
    n: '04', label: 'Case File', timing: '6ms',
    stat: 'DEFINITE', unit: 'confidence grade',
    headline: 'Identity grade, claims history, and evidence packet — ready to act on.',
    body: 'You get the identity confidence grade, every signal that fired, a factual claims history, and a formatted evidence packet — ready to review, act on, or submit for dispute.',
    screenshot: '/screenshots/pipeline-casefile-v3.png',
    alt: 'Unauth customer profile — Nora Kessler, DEFINITE match, confidence 0.99, order value, order history, merchant record, and identity signals',
  },
] as const;

export default function PipelineTabs() {
  const [active, setActive]     = useState<TabId>(0);
  const [paused, setPaused]     = useState(false);
  const [progress, setProgress] = useState(0);
  const [fade, setFade]         = useState(true);
  const rafRef    = useRef<number>(0);
  const startRef  = useRef<number>(0);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>();

  const triggerFade = useCallback(() => {
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    setFade(false);
    fadeTimer.current = setTimeout(() => setFade(true), 351);
  }, []);

  const advance = useCallback(() => {
    triggerFade();
    setActive((p) => ((p + 1) % 4) as TabId);
    setProgress(0);
    startRef.current = 0;
  }, [triggerFade]);

  useEffect(() => {
    if (paused) { cancelAnimationFrame(rafRef.current); return; }
    startRef.current = 0;
    function tick(now: number) {
      if (!startRef.current) startRef.current = now;
      const p = Math.min((now - startRef.current) / DWELL, 1);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else advance();
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, paused, advance]);

  function jumpTo(i: TabId) {
    if (i === active) return;
    cancelAnimationFrame(rafRef.current);
    triggerFade();
    setActive(i);
    setProgress(0);
    startRef.current = 0;
  }

  const step = STEPS[active];

  return (
    <section
      id="how-it-works"
      style={{ scrollMarginTop: '72px', background: t.cream, position: 'relative' }}
      className="ua-section-flow"
    >
      <div
        className="ua-pipeline-shell relative mx-auto max-w-[1400px] px-6 md:px-10 pb-16 md:pb-24"
        style={{ paddingTop: 'clamp(48px, 8vw, 128px)' }}
      >
        {/* ── Header ── */}
        <div className="ua-pipeline-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{
            fontFamily: t.mono, fontSize: '11px', fontWeight: 600,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: t.accent, marginBottom: '20px',
          }}>
            § 2 — THE PIPELINE
          </p>
          <h2 style={{
            fontFamily: t.sans, fontSize: 'clamp(36px, 4vw, 56px)',
            fontWeight: 500, letterSpacing: '-0.028em', lineHeight: 1.05,
            color: t.ink, marginBottom: '18px', maxWidth: '780px',
            marginLeft: 'auto', marginRight: 'auto',
          }}>
            CSV in.{' '}
            <span style={{ fontFamily: t.serif, fontStyle: 'italic', fontWeight: 400, color: t.inkMuted }}>
              Actionable cases out.
            </span>
          </h2>
          <p style={{
            fontFamily: t.serif, fontSize: 'clamp(15px, 1.15vw, 18px)',
            color: t.inkMuted, lineHeight: 1.55, margin: 0,
            maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto',
          }}>
            Hash sensitive fields in the browser. Get scored clusters, signals, and case files back — in 38ms, end-to-end.
          </p>
        </div>

        {/* ── Main panel ── */}
        <div
          className="ua-pipeline-stage"
          style={{
            display: 'grid', gridTemplateColumns: '300px 1fr', alignItems: 'stretch',
            height: '620px', gap: '32px',
          }}
        >

            {/* ── Left: step nav + content (self-contained card) ── */}
            <div className="ua-pipeline-control" style={{
              border: `1px solid ${t.line}`,
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              background: t.paper,
              boxShadow: '0 10px 36px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.07)',
            }}>

              {/* Step rows */}
              {STEPS.map((s, i) => {
                const on = active === i;
                return (
                  <button
                    key={s.n}
                    onClick={() => jumpTo(i as TabId)}
                    style={{
                      position: 'relative',
                      display: 'flex', alignItems: 'center',
                      padding: '14px 20px 14px 17px',
                      background: on ? 'rgba(123,45,38,0.03)' : 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${t.lineFaint}`,
                      borderLeft: `3px solid ${on ? t.accent : 'transparent'}`,
                      cursor: 'pointer', textAlign: 'left',
                      overflow: 'hidden',
                      transition: 'background 180ms',
                    }}
                  >
                    <span style={{
                      fontFamily: t.mono, fontSize: '10px', letterSpacing: '0.08em',
                      color: on ? t.accent : t.inkFaint, flexShrink: 0, marginRight: '10px',
                    }}>
                      {s.n}
                    </span>
                    <span style={{
                      fontFamily: t.sans, fontSize: '13.5px', letterSpacing: '-0.008em',
                      fontWeight: on ? 600 : 500, color: on ? t.ink : t.inkMuted, flex: 1,
                    }}>
                      {s.label}
                    </span>
                    <span style={{
                      fontFamily: t.mono, fontSize: '10px', letterSpacing: '0.04em',
                      color: t.inkFaint, flexShrink: 0, marginLeft: '8px',
                    }}>
                      {s.timing}
                    </span>

                    {/* Active progress fill */}
                    {on && !paused && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0,
                        height: '2px', width: `${progress * 100}%`,
                        background: t.accent, transition: 'none',
                      }} />
                    )}
                  </button>
                );
              })}

              {/* Active step content */}
              <div
                key={active}
                className="ua-step-content"
                style={{ flex: 1, padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{
                    fontFamily: t.sans, fontSize: '64px', lineHeight: 0.88,
                    fontWeight: 500, letterSpacing: '-0.04em', color: t.ink,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {step.stat}
                  </span>
                  <span style={{ fontFamily: t.sans, fontSize: '14px', color: t.inkMuted, lineHeight: 1.2 }}>
                    {step.unit}
                  </span>
                </div>
                <h3 style={{
                  fontFamily: t.sans, fontSize: '19px', lineHeight: 1.22,
                  fontWeight: 500, letterSpacing: '-0.015em', color: t.ink, margin: 0,
                }}>
                  {step.headline}
                </h3>
                <p style={{
                  fontFamily: t.serif, fontSize: '14px', lineHeight: 1.68,
                  color: t.inkMuted, margin: 0,
                }}>
                  {step.body}
                </p>
              </div>

              {/* Bottom bar */}
              <div style={{
                padding: '11px 20px',
                borderTop: `1px solid ${t.lineFaint}`,
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <button
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? 'Resume' : 'Pause'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '7px',
                    background: 'transparent',
                    border: `1px solid ${t.line}`,
                    borderRadius: '3px', padding: '4px 10px',
                    cursor: 'pointer', color: t.inkFaint,
                  }}
                >
                  {paused ? (
                    <svg width="7" height="9" viewBox="0 0 7 9" fill="none">
                      <path d="M1 0.5l5.5 4L1 8.5V0.5z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="7" height="9" viewBox="0 0 7 9" fill="none">
                      <rect x="0.5" y="0.5" width="2" height="8" rx="0.5" fill="currentColor" />
                      <rect x="4.5" y="0.5" width="2" height="8" rx="0.5" fill="currentColor" />
                    </svg>
                  )}
                  <span style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {paused ? 'Play' : 'Pause'}
                  </span>
                </button>
                <span style={{
                  fontFamily: t.mono, fontSize: '9px', color: t.inkFaint,
                  letterSpacing: '0.06em', marginLeft: 'auto',
                }}>
                  38ms end-to-end
                </span>
              </div>
            </div>

            {/* ── Right: mobile gets a bespoke step visual; desktop keeps the screenshot ── */}
            <div
              key={active}
              className="ua-artifact-enter ua-pipeline-screenshot"
              style={{
                opacity: fade ? 1 : 0,
                transition: 'opacity 351ms',
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 10px 36px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.07)',
                border: `1px solid ${t.line}`,
              }}
            >
              <Image
                src={step.screenshot}
                alt={step.alt}
                fill
                className="ua-pipeline-screenshot-img"
                sizes="(max-width: 900px) 100vw, 60vw"
                priority={active === 0}
              />
            </div>

        </div>
      </div>

      <style>{`
        .ua-pipeline-screenshot-img { object-fit: cover; object-position: top left; }
        @media (max-width: 900px) {
          .ua-pipeline-screenshot-img { object-fit: contain !important; object-position: center !important; background: #fdfbf6; }
          .ua-pipeline-header { margin-bottom: 24px !important; }
          .ua-pipeline-header h2 { font-size: clamp(28px, 7vw, 40px) !important; margin-bottom: 12px !important; }
          .ua-pipeline-header p { font-size: 14px !important; }
          .ua-pipeline-stage {
            display: flex !important;
            flex-direction: column !important;
            grid-template-columns: 1fr !important;
            height: auto !important;
            gap: 14px !important;
          }
          .ua-pipeline-control {
            order: 2;
            display: grid !important;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            border-radius: 6px !important;
          }
          .ua-pipeline-screenshot {
            order: 1;
            width: 100%;
            margin-left: 0;
            margin-right: 0;
            aspect-ratio: 16 / 11 !important;
            min-height: 0 !important;
            height: auto !important;
            border-radius: 6px !important;
            border: 1px solid var(--landing-line) !important;
            box-shadow: 0 6px 18px rgba(0,0,0,0.08) !important;
            background: #fdfbf6;
          }
          .ua-pipeline-control > button {
            min-height: 48px;
            padding: 8px 4px !important;
            justify-content: center;
            border-left: none !important;
            border-right: 1px solid var(--landing-line-faint) !important;
          }
          .ua-pipeline-control > button:nth-child(4) {
            border-right: none !important;
          }
          .ua-pipeline-control > button span:first-child {
            display: none;
          }
          .ua-pipeline-control > button span:nth-child(2) {
            flex: unset !important;
            font-size: 11.5px !important;
            text-align: center;
          }
          .ua-pipeline-control > button span:nth-child(3) {
            display: none;
          }
          .ua-step-content {
            grid-column: 1 / -1;
            flex: unset !important;
            padding: 14px 16px 16px !important;
            gap: 8px !important;
          }
          .ua-step-content > div:first-child span:first-child {
            font-size: 32px !important;
          }
          .ua-step-content h3 {
            font-size: 15px !important;
            line-height: 1.22 !important;
          }
          .ua-step-content p {
            font-size: 12px !important;
            line-height: 1.42 !important;
          }
          .ua-pipeline-control > div:last-child {
            grid-column: 1 / -1;
            padding: 9px 16px !important;
          }
        }
        @keyframes ua-artifact-enter {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .ua-artifact-enter {
          animation: ua-artifact-enter 878ms ease;
        }
        @keyframes ua-step-content-enter {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ua-step-content {
          animation: ua-step-content-enter 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
      `}</style>
    </section>
  );
}
