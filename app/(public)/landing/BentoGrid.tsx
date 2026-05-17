import { NetworkGraph } from './NetworkGraph';

const MONO: React.CSSProperties = { fontFamily: 'var(--font-dm-mono, monospace)' };
const SANS: React.CSSProperties = { fontFamily: 'var(--font-dm-sans, sans-serif)' };
const SERIF: React.CSSProperties = { fontFamily: 'var(--font-serif, serif)' };

const CARD: React.CSSProperties = {
  background: '#EDE8DE',
  border: '1px solid #D8D0BD',
  borderRadius: '12px',
  padding: '28px',
  boxShadow:
    '0 0 0 1px rgba(26,24,20,0.02),' +
    '0 2px 4px -1px rgba(26,24,20,0.04),' +
    '0 10px 24px -4px rgba(26,24,20,0.06)',
  position: 'relative',
  overflow: 'hidden',
};

const EYEBROW: React.CSSProperties = {
  ...MONO,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: '#7B2D26',
  marginBottom: '10px',
  fontWeight: 600,
};

const HEADLINE: React.CSSProperties = {
  ...SANS,
  fontSize: '17px',
  fontWeight: 600,
  color: '#1A1814',
  marginBottom: '8px',
  letterSpacing: '-0.01em',
};

const BODY: React.CSSProperties = {
  ...SERIF,
  fontSize: '14px',
  color: '#6A6050',
  lineHeight: 1.6,
  margin: 0,
};

const GRADES = [
  { label: 'DEFINITE',  score: '≥ 0.90', color: '#7B2D26',  bg: 'rgba(123,45,38,0.07)',  border: 'rgba(123,45,38,0.18)' },
  { label: 'PROBABLE',  score: '≥ 0.70', color: '#8C5A28',  bg: 'rgba(140,90,40,0.07)',  border: 'rgba(140,90,40,0.18)' },
  { label: 'POSSIBLE',  score: '≥ 0.50', color: '#6A6050',  bg: 'rgba(106,96,80,0.06)',  border: 'rgba(106,96,80,0.15)' },
  { label: 'WEAK',      score: '≥ 0.30', color: '#8A8472',  bg: 'rgba(138,132,114,0.05)', border: 'rgba(138,132,114,0.12)' },
];

const PII_FIELDS = ['email', 'phone', 'address', 'card', 'device', 'postcode'];

export function BentoGrid() {
  return (
    <section
      style={{ margin: '0 auto', maxWidth: '1400px', padding: '0 24px 80px' }}
    >
      {/* Desktop 3×2 bento */}
      <div
        className="hidden md:grid"
        style={{
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}
      >
        {/* Tile 1: Cross-merchant identity — spans 2 cols */}
        <div style={{ ...CARD, gridColumn: 'span 2' }}>
          <p style={EYEBROW}>CROSS-MERCHANT IDENTITY</p>
          <p style={HEADLINE}>One buyer, seven merchants</p>
          <p style={{ ...BODY, marginBottom: '28px', maxWidth: '420px' }}>
            The same person rotates emails, cards, and addresses across your network.
            Our graph resolves the pattern — hover a node to inspect the merchant relationship.
          </p>
          <NetworkGraph />
          {/* Ghost accent */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: '-24px',
              top: '-24px',
              fontSize: '120px',
              fontWeight: 700,
              ...MONO,
              color: 'rgba(123,45,38,0.03)',
              lineHeight: 1,
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            01
          </span>
        </div>

        {/* Tile 2: Confidence grades */}
        <div style={CARD}>
          <p style={EYEBROW}>CONFIDENCE GRADES</p>
          <p style={HEADLINE}>Four resolution tiers</p>
          <p style={{ ...BODY, marginBottom: '20px' }}>
            Every cluster returns a calibrated confidence grade, not just a binary flag.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {GRADES.map(({ label, score, color, bg, border }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: bg,
                  border: `1px solid ${border}`,
                }}
              >
                <span style={{ ...MONO, fontSize: '11px', color, fontWeight: 600, letterSpacing: '0.08em' }}>
                  {label}
                </span>
                <span style={{ ...MONO, fontSize: '11px', color: '#8A8472' }}>
                  risk {score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tile 3: Evidence packets */}
        <div style={CARD}>
          <p style={EYEBROW}>EVIDENCE PACKETS</p>
          <p style={HEADLINE}>CE&nbsp;3.0 ready</p>
          <p style={{ ...BODY, marginBottom: '20px' }}>
            Pre-formatted evidence packets for chargeback disputes.
            Every signal documented, every merchant observation logged.
          </p>
          {/* Mini terminal mock */}
          <div
            style={{
              background: '#F4F0E8',
              border: '1px solid #D8D0BD',
              borderRadius: '12px',
              padding: '14px 16px',
            }}
          >
            <div style={{ ...MONO, fontSize: '10px', color: '#7B2D26', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.08em' }}>
              CE 3.0 PACKET · UN-2026-04-21-0083
            </div>
            {[
              'cluster_id:          u_kessler.07',
              'merchants_observed:  7',
              'evidence_items:      14',
              'dispute_ready:       true',
            ].map((line) => (
              <div key={line} style={{ ...MONO, fontSize: '10px', color: '#6A6050', lineHeight: 1.9 }}>
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Tile 4: Hashed PII */}
        <div style={CARD}>
          <p style={EYEBROW}>PRIVACY BY DESIGN</p>
          <p style={HEADLINE}>Hashed, never raw</p>
          <p style={{ ...BODY, marginBottom: '20px' }}>
            All PII fields hashed client-side with HMAC-SHA256 before transmission.
            We never see your raw data.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            {PII_FIELDS.map((field) => (
              <div
                key={field}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: '#6B9E82',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    ...MONO,
                    fontSize: '10px',
                    color: '#8A8472',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {field} → hash
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tile 5: Real-time + Batch */}
        <div style={CARD}>
          <p style={EYEBROW}>INTEGRATION</p>
          <p style={HEADLINE}>Real-time or batch</p>
          <p style={{ ...BODY, marginBottom: '24px' }}>
            Stream orders live via API or upload a CSV export.
            Both paths produce identical output — same scores, same clusters.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { label: 'REAL-TIME API', sub: '< 80ms p95' },
              { label: 'CSV BATCH',     sub: '~10 min/50k orders' },
            ].map(({ label, sub }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  padding: '14px 12px',
                  border: '1px solid #D8D0BD',
                  borderRadius: '12px',
                  background: 'rgba(244,240,232,0.5)',
                }}
              >
                <p style={{ ...MONO, fontSize: '10px', color: '#4A4640', letterSpacing: '0.07em', margin: '0 0 4px' }}>
                  {label}
                </p>
                <p style={{ ...MONO, fontSize: '9px', color: '#8A8472', margin: 0 }}>
                  {sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: simple stacked cards */}
      <div className="grid md:hidden grid-cols-1 gap-5">
        {[
          {
            eyebrow: 'CROSS-MERCHANT IDENTITY',
            title: 'One buyer, seven merchants',
            body: 'The same person rotates emails, cards, and addresses across your network. Our graph resolves the pattern.',
          },
          {
            eyebrow: 'CONFIDENCE GRADES',
            title: 'Four resolution tiers',
            body: 'Every cluster returns DEFINITE, PROBABLE, POSSIBLE, or WEAK — not just a binary flag.',
          },
          {
            eyebrow: 'EVIDENCE PACKETS',
            title: 'CE 3.0 ready',
            body: 'Pre-formatted evidence packets for chargeback disputes. Every signal documented.',
          },
          {
            eyebrow: 'PRIVACY BY DESIGN',
            title: 'Hashed, never raw',
            body: 'All PII fields hashed client-side with HMAC-SHA256 before transmission.',
          },
          {
            eyebrow: 'INTEGRATION',
            title: 'Real-time or batch',
            body: 'Stream orders live via API or upload a CSV export. Both paths produce identical output.',
          },
        ].map(({ eyebrow, title, body }) => (
          <div key={eyebrow} style={CARD}>
            <p style={EYEBROW}>{eyebrow}</p>
            <p style={HEADLINE}>{title}</p>
            <p style={BODY}>{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
