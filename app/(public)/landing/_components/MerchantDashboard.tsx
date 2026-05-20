'use client';

const MONO  = 'var(--font-dm-mono, monospace)';
const SANS  = 'var(--font-dm-sans, sans-serif)';

// Hero card palette — matches HeroNotificationArtifact exactly
const ACCENT   = '#7B2D26';
const AMBER    = '#C07838';
const CARD_BG  = 'rgba(22,21,16,0.96)';
const CARD_HD  = 'rgba(15,14,10,0.65)';
const CARD_BD  = 'rgba(48,44,36,0.9)';
const CARD_HB  = 'rgba(48,44,36,0.7)';
const SHELL    = '#15140F';
const SHELL2   = '#1A1914';
const SHELL3   = '#2B2922';

// Text scale
const T0 = '#E8E4D8';  // near-white
const T1 = '#C8BAA4';  // primary
const T2 = '#8A8472';  // secondary
const T3 = '#5A5650';  // tertiary
const T4 = '#4A4640';  // muted

// ── Data ─────────────────────────────────────────────────────────────────────

const CASES = [
  {
    id: '#u_kessler.07', verdict: 'DEFINITE', risk: 0.92, conf: 0.96,
    exposure: '$1,210', merchants: 7, k: 7, sigFired: 8, sigTotal: 12,
    card: '••4419', disputes: 2, lastSeen: '2d ago',
    email: 'k.harris@gmail.c…', deviceHash: 'f9a3..cd81',
    orders: [
      { id: 'ord_8724501', amount: '$420', store: 'Kessler',  status: 'REFUND_DENIED' },
      { id: 'ord_8134220', amount: '$350', store: 'Midform',  status: 'INR_FILED'     },
      { id: 'ord_7891023', amount: '$440', store: 'Northrun', status: 'CB_RISK'       },
    ],
    signals: [
      { l: 'refund_rate_over_60pct',  v: 0.92, fired: true  },
      { l: 'cross_merchant_inr',      v: 0.88, fired: true  },
      { l: 'address_variant',         v: 0.74, fired: true  },
      { l: 'denial_then_chargeback',  v: 0.68, fired: false },
      { l: 'velocity_72h',            v: 0.61, fired: true  },
    ],
    status: 'EVIDENCE READY', statusType: 'ready',
  },
  {
    id: '#u_patel.12', verdict: 'POSSIBLE', risk: 0.87, conf: 0.91,
    exposure: '$890', merchants: 4, k: 4, sigFired: 6, sigTotal: 12,
    card: '••7730', disputes: 1, lastSeen: '4d ago',
    email: 'rp1992@hotmail.c…', deviceHash: '2e77..ba04',
    orders: [
      { id: 'ord_9102837', amount: '$310', store: 'Midform',     status: 'INR_FILED'     },
      { id: 'ord_8891223', amount: '$280', store: 'Bridleworks', status: 'OPEN'          },
      { id: 'ord_8678441', amount: '$300', store: 'Prime & Co',  status: 'REFUND_DENIED' },
    ],
    signals: [
      { l: 'cross_merchant_inr',      v: 0.88, fired: true  },
      { l: 'address_variant',         v: 0.74, fired: true  },
      { l: 'multi_email_device',      v: 0.70, fired: true  },
      { l: 'denial_then_chargeback',  v: 0.68, fired: false },
      { l: 'velocity_72h',            v: 0.61, fired: false },
    ],
    status: 'UNDER REVIEW', statusType: 'review',
  },
  {
    id: '#u_rashid.04', verdict: 'POSSIBLE', risk: 0.79, conf: 0.84,
    exposure: '$440', merchants: 3, k: 3, sigFired: 5, sigTotal: 12,
    card: '••3301', disputes: 1, lastSeen: '1w ago',
    email: 'customer.r@example.co…', deviceHash: 'a1c2..9f30',
    orders: [
      { id: 'ord_8002314', amount: '$220', store: 'Northrun', status: 'CB_RISK'       },
      { id: 'ord_7884120', amount: '$220', store: 'Oakshelf', status: 'REFUND_DENIED' },
    ],
    signals: [
      { l: 'denial_then_chargeback',  v: 0.68, fired: true  },
      { l: 'fingerprint_match',       v: 0.64, fired: true  },
      { l: 'velocity_72h',            v: 0.61, fired: true  },
      { l: 'refund_rate_over_60pct',  v: 0.55, fired: false },
      { l: 'multi_email_device',      v: 0.48, fired: false },
    ],
    status: 'UNDER REVIEW', statusType: 'review',
  },
  {
    id: '#u_chen.19', verdict: 'WATCH', risk: 0.61, conf: 0.72,
    exposure: '$220', merchants: 3, k: 3, sigFired: 3, sigTotal: 12,
    card: '••8812', disputes: 0, lastSeen: '10d ago',
    email: 'w.chen88@example.c…', deviceHash: '8b44..1120',
    orders: [
      { id: 'ord_7612098', amount: '$220', store: 'Oakshelf', status: 'OPEN' },
    ],
    signals: [
      { l: 'fingerprint_match',       v: 0.64, fired: true  },
      { l: 'multi_email_device',      v: 0.61, fired: true  },
      { l: 'velocity_72h',            v: 0.44, fired: false },
      { l: 'address_variant',         v: 0.38, fired: false },
    ],
    status: 'MONITORING', statusType: 'watch',
  },
  {
    id: '#u_james.08', verdict: 'CLEARED', risk: 0.22, conf: 0.41,
    exposure: '—', merchants: 2, k: 2, sigFired: 1, sigTotal: 12,
    card: '••5540', disputes: 0, lastSeen: '3w ago',
    email: 'james.t@gmail.co…', deviceHash: '3d91..fc22',
    orders: [
      { id: 'ord_7009871', amount: '$180', store: 'Kessler', status: 'COMPLETE' },
    ],
    signals: [
      { l: 'refund_rate_over_60pct',  v: 0.22, fired: false },
      { l: 'velocity_72h',            v: 0.18, fired: false },
    ],
    status: 'CLEARED', statusType: 'cleared',
  },
];

const ACTIVITY = [
  {
    type: 'CLUSTER MATCH', typeColor: 'red',
    title: '#u_patel.12 linked to Midform + 3 others',
    detail: '4 merchants · k = 4 · POSSIBLE · conf 0.91',
    time: '2m ago',
  },
  {
    type: 'EVIDENCE READY', typeColor: 'red',
    title: 'Case file assembled: #u_kessler.07',
    detail: '$1,210 exposure · DEFINITE · conf 0.96',
    time: '14m ago',
  },
  {
    type: 'SIGNAL FIRED', typeColor: 'amber',
    title: 'cross_merchant_inr on ord_8891223',
    detail: '#u_patel.12 · weight 0.88 · Bridleworks',
    time: '1h ago',
  },
  {
    type: 'DISPUTE FILED', typeColor: 'red',
    title: 'ord_7891023 — Northrun chargeback risk',
    detail: '#u_kessler.07 · $440 at risk · 2nd dispute',
    time: '2h ago',
  },
  {
    type: 'AUDIT COMPLETE', typeColor: 'gray',
    title: '11 rows processed · 3 new flags raised',
    detail: '38ms · k ≥ 3 gate · 2026-05-20 09:42 EST',
    time: '3h ago',
  },
];

const TOP_SIGNALS = [
  { l: 'refund_rate_over_60pct', cases: 4, v: 0.92 },
  { l: 'cross_merchant_inr',     cases: 3, v: 0.88 },
  { l: 'address_variant',        cases: 3, v: 0.74 },
  { l: 'denial_then_chargeback', cases: 2, v: 0.68 },
  { l: 'fingerprint_match',      cases: 2, v: 0.64 },
  { l: 'multi_email_device',     cases: 2, v: 0.61 },
];

const NETWORK = [
  { name: 'Kessler',     exposure: '$620', disputes: 2 },
  { name: 'Midform',     exposure: '$660', disputes: 2 },
  { name: 'Northrun',    exposure: '$660', disputes: 2 },
  { name: 'Oakshelf',    exposure: '$440', disputes: 1 },
  { name: 'Bridleworks', exposure: '$280', disputes: 1 },
  { name: 'Prime & Co',  exposure: '$300', disputes: 1 },
  { name: 'Vantage Co',  exposure: '—',    disputes: 0 },
];

const SPARKLINE = [18, 24, 22, 31, 28, 38, 45, 62];

// ── Helpers ───────────────────────────────────────────────────────────────────

function vColor(verdict: string) {
  if (verdict === 'DEFINITE') return ACCENT;
  if (verdict === 'POSSIBLE') return AMBER;
  if (verdict === 'WATCH')    return T2;
  return T3;
}

function orderStatusColor(s: string) {
  if (s === 'CB_RISK' || s === 'INR_FILED') return ACCENT;
  if (s === 'REFUND_DENIED')                return AMBER;
  if (s === 'COMPLETE')                     return T3;
  return T2;
}

function actColor(c: string) {
  if (c === 'red')   return ACCENT;
  if (c === 'amber') return AMBER;
  return T3;
}

function statusColor(t: string) {
  if (t === 'ready')  return ACCENT;
  if (t === 'review') return AMBER;
  if (t === 'watch')  return T2;
  return T3;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CaseCard({ c }: { c: typeof CASES[0] }) {
  const cleared = c.statusType === 'cleared';

  return (
    <figure
      style={{
        margin: 0,
        background: CARD_BG,
        border: `1px solid ${CARD_BD}`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -8px rgba(0,0,0,0.6)',
        opacity: cleared ? 0.58 : 1,
      }}
    >
      {/* Chrome header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px',
          background: CARD_HD,
          borderBottom: `1px solid ${CARD_HB}`,
          gap: '8px', flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: MONO, fontSize: '11.5px', letterSpacing: '0.01em', color: T0, fontWeight: 500 }}>
            {c.id}
          </span>
          <span
            style={{
              fontFamily: MONO, fontSize: '8.5px', letterSpacing: '0.1em',
              padding: '2px 8px',
              background: `${vColor(c.verdict)}1A`,
              color: vColor(c.verdict),
              border: `1px solid ${vColor(c.verdict)}40`,
            }}
          >
            {c.verdict}
          </span>
          <span style={{ fontFamily: MONO, fontSize: '9px', color: T3 }}>CONF {c.conf.toFixed(2)}</span>
          <span style={{ fontFamily: MONO, fontSize: '9px', color: T3 }}>k = {c.k}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: MONO, fontSize: '9px', color: T4 }}>{c.lastSeen}</span>
          <span
            style={{
              fontFamily: MONO, fontSize: '8.5px', letterSpacing: '0.08em',
              color: statusColor(c.statusType),
            }}
          >
            {c.status}{c.statusType === 'ready' ? ' →' : ''}
          </span>
        </div>
      </div>

      {/* Body: orders left, signals right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        {/* Orders */}
        <div style={{ padding: '10px 14px', borderRight: `1px solid ${CARD_HB}` }}>
          <div
            style={{
              fontFamily: MONO, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: T4, marginBottom: '7px',
            }}
          >
            Orders · {c.orders.length} in cluster
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {c.orders.map((o) => (
              <div
                key={o.id}
                style={{
                  display: 'grid', gridTemplateColumns: '78px 38px 1fr',
                  gap: '8px', alignItems: 'baseline',
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: '9px', color: T3 }}>{o.id}</span>
                <span
                  style={{
                    fontFamily: MONO, fontSize: '9px', color: T1,
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {o.amount}
                </span>
                <span
                  style={{
                    fontFamily: MONO, fontSize: '8.5px',
                    color: orderStatusColor(o.status),
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {o.status}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: '8px', color: T4, marginTop: '6px' }}>
            {c.orders[0].store}{c.merchants > 1 ? ` + ${c.merchants - 1} more` : ''}
          </div>
        </div>

        {/* Signals */}
        <div style={{ padding: '10px 14px' }}>
          <div
            style={{
              fontFamily: MONO, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: T4, marginBottom: '7px',
            }}
          >
            Signals · {c.sigFired}/{c.sigTotal} fired
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {c.signals.map((s) => (
              <div
                key={s.l}
                style={{ display: 'grid', gridTemplateColumns: '1fr 46px 14px', gap: '6px', alignItems: 'center' }}
              >
                <span
                  style={{
                    fontFamily: MONO, fontSize: '9px',
                    color: s.fired ? T2 : T4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {s.l}
                </span>
                <div style={{ height: '2px', background: 'rgba(48,44,36,0.8)' }}>
                  <div
                    style={{
                      width: `${s.v * 100}%`, height: '100%',
                      background: s.fired ? vColor(c.verdict) : T4,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: MONO, fontSize: '8.5px',
                    color: s.fired ? vColor(c.verdict) : T4,
                    textAlign: 'right',
                  }}
                >
                  {s.fired ? '●' : '○'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer stats strip */}
      <figcaption
        style={{
          display: 'flex', alignItems: 'stretch',
          borderTop: `1px solid ${CARD_HB}`,
          background: CARD_HD,
        }}
      >
        {[
          { k: 'exposure',  v: c.exposure,      hi: false,          flex: false },
          { k: 'merchants', v: `${c.merchants}`, hi: false,          flex: false },
          { k: 'disputes',  v: `${c.disputes}`,  hi: c.disputes > 0, flex: false },
          { k: 'card',      v: c.card,           hi: false,          flex: false },
          { k: 'device',    v: c.deviceHash,     hi: false,          flex: false },
          { k: 'email',     v: c.email,          hi: false,          flex: true  },
        ].map((stat, i, arr) => (
          <div
            key={stat.k}
            style={{
              padding: '6px 11px',
              borderRight: i < arr.length - 1 ? `1px solid ${CARD_HB}` : 'none',
              flex: stat.flex ? 1 : '0 0 auto',
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontFamily: MONO, fontSize: '7.5px',
                letterSpacing: '0.08em', textTransform: 'uppercase', color: T4,
              }}
            >
              {stat.k}
            </div>
            <div
              style={{
                fontFamily: MONO, fontSize: '9.5px',
                color: stat.hi ? ACCENT : stat.k === 'exposure' ? T1 : T3,
                marginTop: '2px',
                fontVariantNumeric: 'tabular-nums',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {stat.v}
            </div>
          </div>
        ))}
      </figcaption>
    </figure>
  );
}

function ActivityCard({ a }: { a: typeof ACTIVITY[0] }) {
  return (
    <figure
      style={{
        margin: 0,
        background: CARD_BG,
        border: `1px solid ${CARD_BD}`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 12px -6px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 12px',
          background: CARD_HD,
          borderBottom: `1px solid ${CARD_HB}`,
        }}
      >
        <span
          style={{
            fontFamily: MONO, fontSize: '9px', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: actColor(a.typeColor),
          }}
        >
          {a.type}
        </span>
        <span style={{ fontFamily: MONO, fontSize: '9px', color: T4, letterSpacing: '0.04em' }}>
          {a.time}
        </span>
      </div>
      <figcaption style={{ padding: '8px 12px 7px' }}>
        <p style={{ fontFamily: SANS, fontSize: '11.5px', fontWeight: 500, color: T1, lineHeight: 1.35, margin: '0 0 3px' }}>
          {a.title}
        </p>
        <p style={{ fontFamily: MONO, fontSize: '9px', color: T3, lineHeight: 1.5, margin: 0 }}>
          {a.detail}
        </p>
      </figcaption>
    </figure>
  );
}

function ClusterNetwork() {
  return (
    <>
      <div
        style={{
          padding: '9px 14px', background: CARD_HD,
          borderBottom: `1px solid ${CARD_HB}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: T2 }}>
          Network exposure
        </span>
        <span style={{ fontFamily: MONO, fontSize: '9px', color: T4 }}>7 merchants</span>
      </div>
      <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {NETWORK.map((m) => (
          <div
            key={m.name}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
              <span
                style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: m.disputes > 0 ? ACCENT : T4,
                  flexShrink: 0, display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: MONO, fontSize: '10px', color: T2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {m.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <span style={{ fontFamily: MONO, fontSize: '9.5px', color: T3, fontVariantNumeric: 'tabular-nums' }}>
                {m.exposure}
              </span>
              {m.disputes > 0 && (
                <span style={{ fontFamily: MONO, fontSize: '8.5px', color: ACCENT }}>
                  {m.disputes}×
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function TrendSparkline() {
  const W = 252, H = 54, PL = 4, PR = 4, PT = 4, PB = 14;
  const max = Math.max(...SPARKLINE);
  const min = Math.min(...SPARKLINE);
  const range = max - min || 1;
  const pts = SPARKLINE.map((v, i) => ({
    x: PL + (i / (SPARKLINE.length - 1)) * (W - PL - PR),
    y: PT + (1 - (v - min) / range) * (H - PT - PB),
  }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1].x} ${H - PB} L ${pts[0].x} ${H - PB} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: H }}>
      <defs>
        <linearGradient id="ua-spark-m" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.28" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line
          key={i}
          x1={PL} x2={W - PR}
          y1={PT + t * (H - PT - PB)} y2={PT + t * (H - PT - PB)}
          stroke={CARD_HB} strokeWidth="1" strokeDasharray="2 3"
        />
      ))}
      <path d={area} fill="url(#ua-spark-m)" />
      <path d={line} fill="none" stroke={ACCENT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {pts.filter((_, i) => i % 2 === 0).map((p, idx) => (
        <text key={idx} x={p.x} y={H} textAnchor="middle" fill={T4} fontFamily={MONO} fontSize="8">
          W{idx * 2 + 1}
        </text>
      ))}
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={ACCENT} />
      <text
        x={pts[pts.length - 1].x - 5}
        y={pts[pts.length - 1].y - 5}
        textAnchor="end"
        fill={ACCENT}
        fontFamily={MONO}
        fontSize="9"
        fontWeight="600"
      >
        62%
      </text>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MerchantDashboard() {
  const openCases     = CASES.filter(c => c.statusType !== 'cleared').length;
  const evidenceReady = CASES.filter(c => c.statusType === 'ready').length;

  return (
    <div
      style={{
        border: `1px solid ${SHELL3}`,
        boxShadow:
          '0 2px 0 rgba(48,44,36,0.4), 0 22px 54px -26px rgba(0,0,0,0.6), 0 44px 96px -48px rgba(123,45,38,0.22)',
        overflow: 'hidden',
      }}
    >
      {/* ── App header ──────────────────────────────────────────────────────── */}
      <div style={{ background: SHELL, borderBottom: `1px solid ${SHELL3}` }}>
        {/* Nav bar */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', borderBottom: `1px solid ${SHELL3}`,
            flexWrap: 'wrap', gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: MONO, fontSize: '12.5px', letterSpacing: '0.1em', color: T0,
                padding: '11px 20px 11px 0', borderRight: `1px solid ${SHELL3}`, marginRight: '20px',
              }}
            >
              unauth
            </span>
            {['Overview', 'Cases', 'Clusters', 'Audits', 'Reports'].map((n, i) => (
              <span
                key={n}
                style={{
                  fontFamily: SANS, fontSize: '12.5px',
                  color: i === 1 ? T0 : T3,
                  padding: '11px 14px',
                  borderBottom: i === 1 ? `2px solid ${ACCENT}` : '2px solid transparent',
                  cursor: 'pointer',
                  letterSpacing: '-0.005em',
                  marginBottom: '-1px',
                }}
              >
                {n}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3A7A40', display: 'inline-block' }} />
              <span style={{ fontFamily: MONO, fontSize: '9.5px', color: T3, letterSpacing: '0.06em' }}>GRAPH LIVE</span>
            </div>
            <span style={{ width: 1, height: 14, background: SHELL3, display: 'inline-block' }} />
            <span style={{ fontFamily: SANS, fontSize: '12.5px', fontWeight: 500, color: T2 }}>Kessler.com</span>
            <span style={{ width: 1, height: 14, background: SHELL3, display: 'inline-block' }} />
            <span style={{ fontFamily: MONO, fontSize: '9.5px', color: T3, letterSpacing: '0.06em' }}>MAY 2026</span>
            <button
              style={{
                fontFamily: MONO, fontSize: '9.5px', color: ACCENT,
                background: `${ACCENT}1A`, border: `1px solid ${ACCENT}40`,
                padding: '5px 12px', letterSpacing: '0.08em', cursor: 'pointer',
              }}
            >
              + NEW AUDIT
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {[
            { label: 'Total exposure',   value: '$2,760',          sub: 'across 4 active cases',  trend: '↑ 18%',  tC: '#D67448' },
            { label: 'Orders flagged',   value: '11',              sub: 'this audit cycle',        trend: '↑ 4',    tC: T2        },
            { label: 'Cases open',       value: `${openCases}`,    sub: '2 need action',           trend: null,     tC: null      },
            { label: 'Evidence ready',   value: `${evidenceReady}`,sub: 'packet assembled',        trend: '→',      tC: ACCENT    },
            { label: 'Avg refund rate',  value: '62%',             sub: 'vs 18% at cycle start',   trend: '↑ 44pp', tC: '#D67448' },
          ].map((k, i) => (
            <div key={i} style={{ padding: '13px 18px', borderRight: i < 4 ? `1px solid ${SHELL3}` : 'none' }}>
              <div
                style={{
                  fontFamily: MONO, fontSize: '8px', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: T4, marginBottom: '5px',
                }}
              >
                {k.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
                <span
                  style={{
                    fontFamily: SANS,
                    fontSize: 'clamp(20px, 2.2vw, 26px)',
                    fontWeight: 500, letterSpacing: '-0.03em',
                    color: k.tC ?? T0,
                    lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {k.value}
                </span>
                {k.trend && (
                  <span style={{ fontFamily: MONO, fontSize: '9px', color: k.tC ?? T3 }}>{k.trend}</span>
                )}
              </div>
              <div style={{ fontFamily: MONO, fontSize: '8px', color: T4, marginTop: '3px' }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 272px', background: SHELL }}
        className="ua-dash-grid"
      >
        {/* LEFT — case list */}
        <div style={{ borderRight: `1px solid ${SHELL3}` }}>
          {/* Section header */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderBottom: `1px solid ${SHELL3}`,
              background: SHELL2, gap: '10px', flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: T2 }}>
                Cases
              </span>
              <span style={{ fontFamily: MONO, fontSize: '9px', color: T3 }}>
                {CASES.length} total · {openCases} open
              </span>
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              {['ALL', 'DEFINITE', 'POSSIBLE', 'WATCH'].map((f, i) => (
                <span
                  key={f}
                  style={{
                    fontFamily: MONO, fontSize: '8.5px', letterSpacing: '0.07em',
                    padding: '3px 9px', cursor: 'pointer',
                    background: i === 0 ? CARD_BD : 'transparent',
                    color: i === 0 ? T1 : T3,
                    border: `1px solid ${i === 0 ? CARD_BD : SHELL3}`,
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Case cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px' }}>
            {CASES.map((c) => <CaseCard key={c.id} c={c} />)}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '8px 14px', background: SHELL2, borderTop: `1px solid ${SHELL3}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: '8.5px', color: T4 }}>
              Audit: 2026-05-20 09:42 EST · 11 rows · 38ms
            </span>
            <span style={{ fontFamily: MONO, fontSize: '8.5px', color: T4 }}>
              k ≥ 3 gate · HMAC-SHA256
            </span>
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Cluster network exposure */}
          <div style={{ background: SHELL2, borderBottom: `1px solid ${SHELL3}` }}>
            <ClusterNetwork />
          </div>

          {/* Activity feed */}
          <div>
            <div
              style={{
                padding: '9px 14px', background: CARD_HD, borderBottom: `1px solid ${CARD_HB}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: T2 }}>
                Activity
              </span>
              <span style={{ fontFamily: MONO, fontSize: '9px', color: T3, letterSpacing: '0.06em' }}>LIVE</span>
            </div>
            <div style={{ background: SHELL, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ACTIVITY.map((a, i) => <ActivityCard key={i} a={a} />)}
            </div>
          </div>

          {/* Top signals */}
          <div style={{ background: SHELL2, borderTop: `1px solid ${SHELL3}`, borderBottom: `1px solid ${SHELL3}` }}>
            <div style={{ padding: '9px 14px', borderBottom: `1px solid ${SHELL3}` }}>
              <span style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: T2 }}>
                Top signals this cycle
              </span>
            </div>
            <div style={{ padding: '9px 14px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {TOP_SIGNALS.map((s) => (
                <div
                  key={s.l}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 32px 24px', gap: '7px', alignItems: 'center' }}
                >
                  <span
                    style={{
                      fontFamily: MONO, fontSize: '9px', color: T3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {s.l}
                  </span>
                  <div style={{ height: '2px', background: CARD_BD }}>
                    <div style={{ width: `${s.v * 100}%`, height: '100%', background: ACCENT }} />
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: '9px', color: T3, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {s.cases}×
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Refund rate sparkline */}
          <div style={{ background: SHELL, flex: 1 }}>
            <div
              style={{
                padding: '9px 14px', background: SHELL2, borderBottom: `1px solid ${SHELL3}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: T2 }}>
                Refund rate
              </span>
              <span style={{ fontFamily: MONO, fontSize: '9px', color: T4 }}>8-week trend</span>
            </div>
            <div style={{ padding: '10px 14px 4px' }}>
              <TrendSparkline />
            </div>
            <div style={{ padding: '0 14px 10px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: MONO, fontSize: '8.5px', color: T4 }}>18% → 62%</span>
              <span style={{ fontFamily: MONO, fontSize: '8.5px', color: ACCENT }}>+44pp ↑</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: SHELL2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 20px', borderTop: `1px solid ${SHELL3}`,
          flexWrap: 'wrap', gap: '8px',
        }}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {[
            ['graph', 'LIVE'],
            ['k-anon', 'k ≥ 3'],
            ['last sync', '4m ago'],
            ['merchants in network', '42'],
          ].map(([label, value]) => (
            <span key={label} style={{ fontFamily: MONO, fontSize: '9px', color: T4, letterSpacing: '0.06em' }}>
              {label} <span style={{ color: T2 }}>{value}</span>
            </span>
          ))}
        </div>
        <span style={{ fontFamily: MONO, fontSize: '9px', color: T4, letterSpacing: '0.06em' }}>
          HMAC-SHA256 · 0 PII FIELDS STORED · SOC 2 IN PROGRESS
        </span>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .ua-dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
