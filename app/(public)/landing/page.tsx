import { UnauthLogo } from '@/components/ui/UnauthLogo';

export const metadata = {
  title: 'Unauth — Fraud Intelligence for Ecommerce',
  description:
    'Cross-merchant identity resolution. Friendly fraud, refund abuse, and INR-claim rings caught by linking identities across stores.',
};

export default function LandingPage() {
  const today = new Date();
  const todayLong = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const todayISO = today.toISOString().slice(0, 10);

  return (
    <div
      style={{
        background: '#F8F5EE',
        color: '#1A1814',
        minHeight: '100vh',
      }}
    >
      {/* ── Header strip ────────────────────────────────────────── */}
      <header
        style={{ borderBottom: 'none' }}
        className="py-5"
      >
        <div className="mx-auto max-w-[1080px] px-6 md:px-10 flex items-center justify-between">
          <UnauthLogo variant="wordmark-light" size={24} />
          <a
            href="/login"
            style={{ color: '#4A4640', fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '14px' }}
            className="hover:underline"
          >
            Sign in
          </a>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1080px] px-6 md:px-10 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Left — cols 1–7 */}
          <div className="md:col-span-7">
            {/* Eyebrow */}
            <p
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#4A4640',
                marginBottom: '20px',
              }}
            >
              <span style={{ color: '#7B2D26' }}>§</span>{' '}
              FRAUD INTELLIGENCE BRIEF — ISSUE 04
            </p>

            {/* Headline */}
            <h1
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 'clamp(36px, 5vw, 60px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                color: '#1A1814',
                marginBottom: '24px',
                maxWidth: '600px',
              }}
            >
              Unauth resolves the buyer your store has never seen — across every store in the network.
            </h1>

            {/* Sub-prose */}
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: 'clamp(17px, 1.4vw, 19px)',
                color: '#4A4640',
                lineHeight: 1.65,
                maxWidth: '540px',
                marginBottom: '16px',
              }}
            >
              Friendly fraud and refund abuse don&rsquo;t repeat at one merchant. They cycle across the network: a slightly different email, a typo in the shipping address, a freshly rotated card. We resolve the identity behind the pattern and hand you the evidence packet before the chargeback window closes.
            </p>

            {/* Italic observation */}
            <p
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontStyle: 'italic',
                fontSize: 'clamp(17px, 1.4vw, 19px)',
                color: '#4A4640',
                lineHeight: 1.65,
                maxWidth: '540px',
                marginBottom: '32px',
              }}
            >
              Currently observing patterns at 84 merchants across DTC fashion, marketplace, audio hardware, and subscription beauty.
              <sup>
                <a href="#note-1" style={{ color: '#7B2D26', textDecoration: 'none', fontStyle: 'normal' }}>1</a>
              </sup>
            </p>

            {/* CTA — inline link only; the single button lives in §5 */}
            <a
              href="/demo"
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontStyle: 'italic',
                fontSize: '15px',
                color: '#4A4640',
                textDecoration: 'none',
              }}
              className="hover:underline"
            >
              or read how cross-merchant identity works ↘
            </a>
          </div>

          {/* Right — cols 8–12 — marginalia (desktop only) */}
          <div className="hidden md:block md:col-span-5">
            <div
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '12px',
                color: '#4A4640',
                letterSpacing: '0.06em',
                lineHeight: 1.8,
                paddingTop: '6px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  marginBottom: '4px',
                }}
              >
                ISSUE 04
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '12px',
                  marginBottom: '4px',
                }}
              >
                {todayLong}
              </p>
              <p style={{ marginBottom: '16px' }}>12 min read</p>
              <p
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  marginBottom: '4px',
                }}
              >
                FILED UNDER
              </p>
              <p style={{ fontSize: '12px', color: '#4A4640' }}>
                identity resolution · refund abuse · CE 3.0
              </p>
            </div>
          </div>

          {/* Mobile marginalia — inline run */}
          <div className="block md:hidden">
            <p
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '12px',
                color: '#4A4640',
                letterSpacing: '0.06em',
              }}
            >
              ISSUE 04 ·{' '}
              <span style={{ fontFamily: 'var(--font-dm-mono, monospace)' }}>{todayLong}</span>
              {' '}· 12 min read
            </p>
          </div>
        </div>
      </section>

      {/* ── Case-file artifact ──────────────────────────────────── */}
      <div className="mx-auto max-w-[1080px] px-6 md:px-10">
        <div
          style={{
            background: '#FDFBF6',
            border: '1px solid #D8D0BD',
            borderRadius: 0,
          }}
        >
          {/* Artifact header */}
          <div
            style={{
              padding: '10px 20px',
              borderBottom: '1px solid #D8D0BD',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#4A4640',
                margin: 0,
              }}
            >
              CASE FILE · UN-2026-04-21-0083 · CONFIDENTIAL · SUBJECT: 1 of 312 this week
            </p>
          </div>

          {/* Two-column body */}
          <div className="grid grid-cols-1 md:grid-cols-[60%_40%] p-5 md:p-10 gap-8 md:gap-0">
            {/* Left — Subject */}
            <div className="md:pr-10 md:border-r md:border-[#D8D0BD]">
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                SUBJECT
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontSize: '16px',
                  color: '#1A1814',
                  marginBottom: '20px',
                }}
              >
                Noah K
                <span
                  style={{
                    background: '#1A1814',
                    color: 'transparent',
                    userSelect: 'none',
                  }}
                >
                  ████
                </span>
                <sup>
                  <a href="#note-1" style={{ color: '#7B2D26', textDecoration: 'none' }}>1</a>
                </sup>
                {' '}· resolved identity{' '}
                <span style={{ fontFamily: 'var(--font-dm-mono, monospace)', fontSize: '15px' }}>
                  #u_kessler.07
                </span>
              </p>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                KNOWN EMAIL VARIANTS
              </p>
              <pre
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '13px',
                  color: '#4A4640',
                  lineHeight: 1.7,
                  margin: '0 0 20px 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
{`noah.kessler@protonmail.com    [primary, observed 4 merchants]
n.kessler@protonmail.com       [observed 2 merchants]
noah_kessler@gmail.com         [observed 1 merchant]
n.k@gmail.com                  [observed 1 merchant, flagged synthetic]`}
              </pre>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                SHIPPING ADDRESSES (3 variants — same residence)
              </p>
              <pre
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '13px',
                  color: '#4A4640',
                  lineHeight: 1.7,
                  margin: '0 0 20px 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}
              >
{`4421 Larkspur Ln, Apt 3B, Portland OR 97214
4421 Larspur Lane Apt 3B, Portland OR 97214      [misspelt — confidence 0.98]
4421 Larkspur Ln #3B, Portland, OR 97214         [normalised match]`}
              </pre>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                PAYMENT
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '13px',
                  color: '#4A4640',
                }}
              >
                Chase Sapphire Reserve  ••••  4419
              </p>
            </div>

            {/* Right — Behavior */}
            <div className="md:pl-10">
              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                NETWORK FOOTPRINT
              </p>
              <div style={{ overflowX: 'auto' }}>
                <pre
                  style={{
                    fontFamily: 'var(--font-dm-mono, monospace)',
                    fontSize: '12px',
                    color: '#4A4640',
                    lineHeight: 1.8,
                    margin: '0 0 20px 0',
                    whiteSpace: 'pre',
                  }}
                >
{`HeyGlow Skincare         $340.00     3 orders     2 refunds claimed
Murmur Audio           $1,210.00     3 orders     2 INR filed`}<sup style={{ fontFamily: 'var(--font-serif, serif)' }}><a href="#note-2" style={{ color: '#7B2D26', textDecoration: 'none' }}>2</a></sup>{`
RidgePath Outfitters     $612.50     2 orders     2 INR filed
Aster & Vale             $284.00     1 order      1 refund claimed
Northbound Goods         $890.00     2 orders     1 INR filed
[2 more merchants withheld]`}
                </pre>
              </div>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                PATTERN
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: '#4A4640',
                  lineHeight: 1.6,
                  marginBottom: '20px',
                }}
              >
                Files INR claim within 2.4 days of marked delivery, on average. 6 of 8 most recent orders disputed. First seen at HeyGlow Skincare on Feb 09, 2026. Most recent activity 4 days ago.
              </p>

              <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 16px 0' }} />

              <p
                style={{
                  fontFamily: 'var(--font-dm-sans, sans-serif)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#4A4640',
                  marginBottom: '8px',
                }}
              >
                RECOMMENDED ACTION
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '12px',
                  color: '#7B2D26',
                  letterSpacing: '0.04em',
                }}
              >
                DECLINE NEXT ORDER · ASSEMBLE CE 3.0 PACKET FOR 2 OPEN DISPUTES
              </p>
            </div>
          </div>

          {/* Artifact footer */}
          <div style={{ borderTop: '1px solid #D8D0BD', padding: '10px 20px' }}>
            <p
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '12px',
                color: '#4A4640',
                margin: 0,
              }}
            >
              File generated 2026-05-15 09:42 EST · risk_score: 0.92 · cluster_confidence: 0.96
            </p>
          </div>
        </div>
      </div>

      {/* ── §1 · The pattern your store can't see ───────────────── */}
      <section className="mx-auto max-w-[1080px] px-6 md:px-10 py-20 md:py-28">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '48px' }} />

        <h2
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#1A1814',
            marginBottom: '32px',
          }}
        >
          §1 · The pattern your store can&rsquo;t see
        </h2>

        <div style={{ maxWidth: '640px' }}>
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(17px, 1.4vw, 19px)',
              lineHeight: 1.65,
              color: '#1A1814',
              marginBottom: '24px',
            }}
          >
            A serial refund abuser doesn&rsquo;t behave like one at your store. They behave like a good customer — at your store. They behave like a good customer at six other stores too. The pattern only resolves when the orders are stacked side by side.
          </p>

          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(17px, 1.4vw, 19px)',
              lineHeight: 1.65,
              color: '#1A1814',
              marginBottom: '24px',
            }}
          >
            Unauth takes a hashed view of your order history — emails, addresses, card fingerprints, never the raw values — and resolves each order to a cross-merchant identity cluster. Every cluster comes back with a confidence grade, a behavioural ledger, and the linked orders. The call is one line:{' '}
            <code
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '0.95em',
                color: '#1A1814',
              }}
            >
              unauth.score(order_id)
            </code>
            . The response is JSON, and we show you exactly which signals fired.
          </p>

          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(17px, 1.4vw, 19px)',
              lineHeight: 1.65,
              color: '#1A1814',
            }}
          >
            Refund abuse and INR fraud cost online retailers an estimated $89 billion a year
            <sup>
              <a href="#note-3" style={{ color: '#7B2D26', textDecoration: 'none' }}>3</a>
            </sup>{' '}
            and 1 in 5 refund claims at growth-stage DTC brands now resolve to a network-known abuser
            <sup>
              <a href="#note-4" style={{ color: '#7B2D26', textDecoration: 'none' }}>4</a>
            </sup>
            . The cost of a lost chargeback runs 2.7× the order value once fees and reversed acquisition are tallied
            <sup>
              <a href="#note-5" style={{ color: '#7B2D26', textDecoration: 'none' }}>5</a>
            </sup>
            . Most of this is preventable. None of it is preventable if you only have your own data.
          </p>
        </div>
      </section>

      {/* ── §2 · Network observation (dark inversion) ───────────── */}
      <section
        style={{ background: '#15140F', color: '#E8E4D8' }}
        className="py-24 md:py-32"
      >
        <div className="mx-auto max-w-[1080px] px-6 md:px-10">
          <h2
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: 'clamp(22px, 2.4vw, 30px)',
              fontWeight: 500,
              color: '#E8E4D8',
              marginBottom: '12px',
            }}
          >
            §2 · Network observation
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '13px',
              color: '#8A8472',
              marginBottom: '48px',
            }}
          >
            {todayISO} · 09:00 to 18:00 EST · refreshed at build
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12" style={{ marginBottom: '40px' }}>
            {/* Col 1 */}
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#8A8472',
                  marginBottom: '12px',
                }}
              >
                IDENTITY CLUSTERS RESOLVED
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '40px',
                  fontWeight: 500,
                  color: '#E8E4D8',
                  marginBottom: '10px',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                12,484
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: '#B8B2A0',
                  lineHeight: 1.5,
                }}
              >
                across 84 merchants in the last 24 hours.
              </p>
            </div>

            {/* Col 2 */}
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#8A8472',
                  marginBottom: '12px',
                }}
              >
                NETWORK-KNOWN ABUSERS IDENTIFIED
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '40px',
                  fontWeight: 500,
                  color: '#E8E4D8',
                  marginBottom: '10px',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                3,107
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: '#B8B2A0',
                  lineHeight: 1.5,
                }}
              >
                filed INR or refund claim at 3+ merchants. 28% never previously seen at the receiving store.
              </p>
            </div>

            {/* Col 3 */}
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#8A8472',
                  marginBottom: '12px',
                }}
              >
                CE 3.0 EVIDENCE PACKETS PREPARED
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '40px',
                  fontWeight: 500,
                  color: '#E8E4D8',
                  marginBottom: '10px',
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                417
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif, serif)',
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: '#B8B2A0',
                  lineHeight: 1.5,
                }}
              >
                ready for merchant review. Median preparation time: 38 seconds.
              </p>
            </div>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(15px, 1.2vw, 17px)',
              color: '#B8B2A0',
              maxWidth: '720px',
              lineHeight: 1.6,
            }}
          >
            The network does not publish merchant names, raw order data, or buyer identities. Every figure above is aggregated and k-anonymity gated.
          </p>
        </div>
      </section>

      {/* ── §3 · How it works ───────────────────────────────────── */}
      <section className="mx-auto max-w-[1080px] px-6 md:px-10 py-20 md:py-28">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '48px' }} />

        <h2
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#1A1814',
            marginBottom: '40px',
          }}
        >
          §3 · How it works
        </h2>

        <div style={{ maxWidth: '640px' }}>
          {/* §3.1 */}
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(17px, 1.4vw, 19px)',
              lineHeight: 1.65,
              color: '#1A1814',
              marginBottom: '28px',
            }}
          >
            <strong
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontWeight: 600,
                fontSize: '14px',
                color: '#1A1814',
              }}
            >
              §3.1
            </strong>{' '}
            You upload a CSV of orders, or stream them in via our API. Before anything leaves your browser, every PII field is hashed with a per-merchant salt — we never see your raw emails or addresses
            <sup>
              <a href="#note-6" style={{ color: '#7B2D26', textDecoration: 'none' }}>6</a>
            </sup>
            . The hashes resolve against the cross-merchant identity graph; the graph does not resolve back. If your buyer has been seen at any of the network&rsquo;s merchants, you see what they did there. You never see who else is in the network or what their order book looks like.
          </p>

          {/* §3.2 */}
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(17px, 1.4vw, 19px)',
              lineHeight: 1.65,
              color: '#1A1814',
              marginBottom: '16px',
            }}
          >
            <strong
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontWeight: 600,
                fontSize: '14px',
                color: '#1A1814',
              }}
            >
              §3.2
            </strong>{' '}
            Every order returns a single signed object. The fields are stable and documented:
          </p>

          <div style={{ marginBottom: '28px' }}>
            <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0 0 0 0' }} />
            <pre
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: '13px',
                color: '#4A4640',
                lineHeight: 1.7,
                padding: '20px 0',
                margin: 0,
                overflowX: 'auto',
                background: 'transparent',
              }}
            >
{`{
  "order_id": "ORD-77241",
  "risk_score": 0.92,
  "cluster_id": "u_kessler.07",
  "confidence_grade": "definite",
  "signals_fired": [
    "refund_rate_over_60pct",
    "cross_merchant_inr_pattern",
    "shipping_address_variant"
  ],
  "merchants_seen_at": 7,
  "evidence_packet_eligible": true
}`}
            </pre>
            <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', margin: '0' }} />
          </div>

          {/* §3.3 */}
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontSize: 'clamp(17px, 1.4vw, 19px)',
              lineHeight: 1.65,
              color: '#1A1814',
            }}
          >
            <strong
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontWeight: 600,
                fontSize: '14px',
                color: '#1A1814',
              }}
            >
              §3.3
            </strong>{' '}
            The recommendation is yours. We don&rsquo;t decline orders for you. We don&rsquo;t move money. We don&rsquo;t write to your checkout. We surface the cluster, the signals, and the evidence — what you do with it depends on your risk appetite and your chargeback ratio. Most teams set a score threshold for auto-review and let the rest pass.
          </p>
        </div>
      </section>

      {/* ── §4 · Two case studies ────────────────────────────────── */}
      <section className="mx-auto max-w-[1080px] px-6 md:px-10 py-20 md:py-28">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '48px' }} />

        <h2
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#1A1814',
            marginBottom: '24px',
          }}
        >
          §4 · What this looks like for two merchants
        </h2>

        <p
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontSize: 'clamp(17px, 1.4vw, 19px)',
            lineHeight: 1.65,
            color: '#4A4640',
            maxWidth: '640px',
            marginBottom: '48px',
          }}
        >
          Two case studies from the network. Numbers are real
          <sup>
            <a href="#note-7" style={{ color: '#7B2D26', textDecoration: 'none' }}>7</a>
          </sup>
          ; merchant names are used with permission.
        </p>

        {/* Case 1 — quote treatment */}
        <div style={{ maxWidth: '720px', marginBottom: '56px' }}>
          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(17px, 1.4vw, 19px)',
              lineHeight: 1.7,
              color: '#1A1814',
              marginBottom: '20px',
            }}
          >
            <span style={{ color: '#7B2D26', fontStyle: 'normal', fontWeight: 600, marginRight: '10px' }}>§</span>
            We were eating $40K a month in friendly fraud and could not see a pattern in our own data. Two weeks after we connected our order history to Unauth, we had clustered 312 abusive identities — half of them active at three or more brands. We now win 71% of the CE 3.0 cases we used to write off.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '13px',
              color: '#4A4640',
            }}
          >
            Priya Raman · Head of Risk, Northbound Goods · April 2026
          </p>
        </div>

        {/* Case 2 — metric treatment */}
        <div style={{ maxWidth: '100%' }}>
          <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '24px' }} />

          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
            <pre
              style={{
                fontFamily: 'var(--font-dm-mono, monospace)',
                fontSize: 'clamp(16px, 1.8vw, 28px)',
                fontVariantNumeric: 'tabular-nums',
                color: '#1A1814',
                lineHeight: 1.55,
                margin: 0,
                whiteSpace: 'pre',
              }}
            >
{`Murmur Audio          $1.2M ARR / DTC audio hardware
INR claim rate        9.4% before Unauth  →  2.1% after
chargeback win rate   18% before  →  64% after`}
            </pre>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-serif, serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(17px, 1.4vw, 19px)',
              lineHeight: 1.65,
              color: '#4A4640',
              maxWidth: '680px',
              marginBottom: '16px',
            }}
          >
            Marcus Liu, fraud ops lead at Murmur, integrated Unauth in 11 days against a CSV-only path. The 7.3-point reduction in INR claim rate was driven almost entirely by cross-merchant identity scoring at checkout-time — buyers with a network-known refund-cycle pattern were declined before fulfilment.
          </p>

          <p
            style={{
              fontFamily: 'var(--font-dm-mono, monospace)',
              fontSize: '13px',
              color: '#4A4640',
              marginBottom: '24px',
            }}
          >
            Source: internal — Murmur Audio · 90-day window ending 2026-04-30
            <sup>
              <a href="#note-8" style={{ color: '#7B2D26', textDecoration: 'none' }}>8</a>
            </sup>
          </p>

          <hr style={{ border: 0, borderTop: '1px solid #D8D0BD' }} />
        </div>
      </section>

      {/* ── §5 · The single CTA ──────────────────────────────────── */}
      <section className="mx-auto max-w-[1080px] px-6 md:px-10 py-20 md:py-28">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '48px' }} />

        <h2
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#1A1814',
            marginBottom: '24px',
          }}
        >
          §5 · If you want to see what&rsquo;s in the network for your store
        </h2>

        <p
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontSize: 'clamp(17px, 1.4vw, 19px)',
            lineHeight: 1.65,
            color: '#1A1814',
            maxWidth: '640px',
            marginBottom: '32px',
          }}
        >
          Send us your last 5,000 orders. We&rsquo;ll hash them in your browser, resolve them against the network, and return a report. There is no setup, no integration, and no card. The audit takes about ten minutes from upload to PDF.
        </p>

        <a
          href="/login"
          style={{
            display: 'inline-block',
            background: '#7B2D26',
            color: '#E8E4D8',
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '14px',
            fontWeight: 500,
            padding: '12px 24px',
            border: '1px solid #7B2D26',
            borderRadius: 0,
            textDecoration: 'none',
            marginBottom: '20px',
          }}
        >
          Run an audit →
        </a>

        <p
          style={{
            fontFamily: 'var(--font-serif, serif)',
            fontStyle: 'italic',
            fontSize: '15px',
            color: '#4A4640',
            maxWidth: '480px',
            lineHeight: 1.6,
          }}
        >
          Or if you&rsquo;d rather just ask questions first, write to{' '}
          <a
            href="mailto:hello@unauth.app"
            style={{ color: '#4A4640' }}
            className="hover:underline"
          >
            hello@unauth.app
          </a>{' '}
          — we&rsquo;ll respond inside two business hours.
        </p>
      </section>

      {/* ── § NOTES ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1080px] px-6 md:px-10 py-20 md:py-28">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '48px' }} />

        <h2
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: 'clamp(22px, 2.4vw, 30px)',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: '#1A1814',
            marginBottom: '32px',
          }}
        >
          § NOTES
        </h2>

        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontFamily: 'var(--font-serif, serif)',
            fontSize: '14px',
            color: '#4A4640',
            lineHeight: 1.65,
          }}
        >
          {[
            [1, 'Resolved identity refers to a cluster of orders linked by Unauth’s identity engine. The cluster ID is a stable, salted hash; the buyer’s real name and PII are never revealed across merchants.'],
            [2, 'INR = Item Not Received. The most common chargeback reason code abused at scale in DTC ecommerce.'],
            [3, 'Visa, Friendly Fraud Annual Index, 2024. Includes refund abuse and INR fraud across all card types.'],
            [4, 'Internal estimate based on Unauth network resolution rates across 84 merchants, Jan–Apr 2026.'],
            [5, 'Mastercard Merchant Survey, 2024. True cost includes fulfilment, reversed acquisition spend, and dispute fees.'],
            [6, 'Hashing is performed client-side using a per-merchant salt that Unauth never sees. The hashed values are queried against the network; raw PII never leaves the merchant’s browser.'],
            [7, 'All metrics are merchant-reported and reviewed against Unauth’s internal audit log. Original case files are available on request under NDA.'],
            [8, 'Murmur Audio integrated Unauth on 2026-01-29. The 90-day comparison window is 2026-01-30 to 2026-04-30.'],
          ].map(([n, text]) => (
            <li
              key={n}
              id={`note-${n}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.8rem 1fr',
                gap: '0 8px',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-dm-mono, monospace)',
                  fontSize: '13px',
                  color: '#7B2D26',
                  paddingTop: '2px',
                }}
              >
                {n}
              </span>
              <span>{text as string}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mx-auto max-w-[1080px] px-6 md:px-10 py-10">
        <hr style={{ border: 0, borderTop: '1px solid #D8D0BD', marginBottom: '24px' }} />
        <div
          className="flex flex-col md:flex-row md:justify-between gap-4"
          style={{
            fontFamily: 'var(--font-dm-sans, sans-serif)',
            fontSize: '12px',
            color: '#4A4640',
          }}
        >
          <span>
            Unauth ·{' '}
            <a href="/legal/privacy" style={{ color: '#4A4640' }} className="hover:underline">privacy</a>
            {' · '}
            <a href="/legal/dpa" style={{ color: '#4A4640' }} className="hover:underline">DPA</a>
            {' · '}
            <a href="/legal/data-handling" style={{ color: '#4A4640' }} className="hover:underline">data handling</a>
          </span>
          <a
            href="mailto:hello@unauth.app"
            style={{ color: '#4A4640' }}
            className="hover:underline"
          >
            hello@unauth.app
          </a>
          <span>
            © 2026 — Issue 04 ·{' '}
            <span style={{ fontFamily: 'var(--font-dm-mono, monospace)' }}>{todayISO}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
