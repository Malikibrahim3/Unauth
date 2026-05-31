'use client';

import { t } from '../_tokens';

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
    detail: '#u_kessler.07 · $440 order value · 2nd dispute',
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
  if (verdict === 'DEFINITE') return t.accent;
  if (verdict === 'POSSIBLE') return t.amber;
  if (verdict === 'WATCH')    return t.inkTertiary;
  return t.darkSubtle;
}

function orderStatusColor(s: string) {
  if (s === 'CB_RISK' || s === 'INR_FILED') return t.accent;
  if (s === 'REFUND_DENIED')                return t.amber;
  if (s === 'COMPLETE')                     return t.darkSubtle;
  return t.inkTertiary;
}

function actColor(c: string) {
  if (c === 'red')   return t.accent;
  if (c === 'amber') return t.amber;
  return t.darkSubtle;
}

function statusColor(type: string) {
  if (type === 'ready')  return t.accent;
  if (type === 'review') return t.amber;
  if (type === 'watch')  return t.inkTertiary;
  return t.darkSubtle;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CaseCard({ c }: { c: typeof CASES[0] }) {
  const cleared = c.statusType === 'cleared';

  return (
    <figure
      style={{
        margin: 0,
        background: t.cardBg,
        border: `1px solid ${t.darkBorder}`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 24px -8px rgba(0,0,0,0.6)',
        opacity: cleared ? 0.58 : 1,
      }}
    >
      {/* Chrome header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px',
          background: t.cardHd,
          borderBottom: `1px solid ${t.darkBorder}`,
          gap: '8px', flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: t.mono, fontSize: '11.5px', letterSpacing: '0.01em', color: t.darkBright, fontWeight: 500 }}>
            {c.id}
          </span>
          <span
            style={{
              fontFamily: t.mono, fontSize: '8.5px', letterSpacing: '0.1em',
              padding: '2px 8px',
              background: `${vColor(c.verdict)}1A`,
              color: vColor(c.verdict),
              border: `1px solid ${vColor(c.verdict)}40`,
            }}
          >
            {c.verdict}
          </span>
          <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.darkSubtle }}>CONF {c.conf.toFixed(2)}</span>
          <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.darkSubtle }}>k = {c.k}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.inkSecondary }}>{c.lastSeen}</span>
          <span
            style={{
              fontFamily: t.mono, fontSize: '8.5px', letterSpacing: '0.08em',
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
        <div style={{ padding: '10px 14px', borderRight: `1px solid ${t.darkBorder}` }}>
          <div
            style={{
              fontFamily: t.mono, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: t.inkSecondary, marginBottom: '7px',
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
                <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.darkSubtle }}>{o.id}</span>
                <span
                  style={{
                    fontFamily: t.mono, fontSize: '9px', color: t.darkWarm,
                    textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {o.amount}
                </span>
                <span
                  style={{
                    fontFamily: t.mono, fontSize: '8.5px',
                    color: orderStatusColor(o.status),
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {o.status}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: t.mono, fontSize: '8px', color: t.inkSecondary, marginTop: '6px' }}>
            {c.orders[0].store}{c.merchants > 1 ? ` + ${c.merchants - 1} more` : ''}
          </div>
        </div>

        {/* Signals */}
        <div style={{ padding: '10px 14px' }}>
          <div
            style={{
              fontFamily: t.mono, fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: t.inkSecondary, marginBottom: '7px',
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
                    fontFamily: t.mono, fontSize: '9px',
                    color: s.fired ? t.inkTertiary : t.inkSecondary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {s.l}
                </span>
                <div style={{ height: '2px', background: 'rgba(48,44,36,0.8)' }}>
                  <div
                    style={{
                      width: `${s.v * 100}%`, height: '100%',
                      background: s.fired ? vColor(c.verdict) : t.inkSecondary,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: t.mono, fontSize: '8.5px',
                    color: s.fired ? vColor(c.verdict) : t.inkSecondary,
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
          borderTop: `1px solid ${t.darkBorder}`,
          background: t.cardHd,
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
              borderRight: i < arr.length - 1 ? `1px solid ${t.darkBorder}` : 'none',
              flex: stat.flex ? 1 : '0 0 auto',
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontFamily: t.mono, fontSize: '7.5px',
                letterSpacing: '0.08em', textTransform: 'uppercase', color: t.inkSecondary,
              }}
            >
              {stat.k}
            </div>
            <div
              style={{
                fontFamily: t.mono, fontSize: '9.5px',
                color: stat.hi ? t.accent : stat.k === 'exposure' ? t.darkWarm : t.darkSubtle,
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
        background: t.cardBg,
        border: `1px solid ${t.darkBorder}`,
        boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 12px -6px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 12px',
          background: t.cardHd,
          borderBottom: `1px solid ${t.darkBorder}`,
        }}
      >
        <span
          style={{
            fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.1em',
            textTransform: 'uppercase', color: actColor(a.typeColor),
          }}
        >
          {a.type}
        </span>
        <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.inkSecondary, letterSpacing: '0.04em' }}>
          {a.time}
        </span>
      </div>
      <figcaption style={{ padding: '8px 12px 7px' }}>
        <p style={{ fontFamily: t.sans, fontSize: '11.5px', fontWeight: 500, color: t.darkWarm, lineHeight: 1.35, margin: '0 0 3px' }}>
          {a.title}
        </p>
        <p style={{ fontFamily: t.mono, fontSize: '9px', color: t.darkSubtle, lineHeight: 1.5, margin: 0 }}>
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
          padding: '9px 14px', background: t.cardHd,
          borderBottom: `1px solid ${t.darkBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.inkTertiary }}>
          Network exposure
        </span>
        <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.inkSecondary }}>7 merchants</span>
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
                  background: m.disputes > 0 ? t.accent : t.inkSecondary,
                  flexShrink: 0, display: 'inline-block',
                }}
              />
              <span
                style={{
                  fontFamily: t.mono, fontSize: '10px', color: t.inkTertiary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {m.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <span style={{ fontFamily: t.mono, fontSize: '9.5px', color: t.darkSubtle, fontVariantNumeric: 'tabular-nums' }}>
                {m.exposure}
              </span>
              {m.disputes > 0 && (
                <span style={{ fontFamily: t.mono, fontSize: '8.5px', color: t.accent }}>
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
          <stop offset="0%" stopColor={t.accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((frac, i) => (
        <line
          key={i}
          x1={PL} x2={W - PR}
          y1={PT + frac * (H - PT - PB)} y2={PT + frac * (H - PT - PB)}
          stroke={t.darkBorder} strokeWidth="1" strokeDasharray="2 3"
        />
      ))}
      <path d={area} fill="url(#ua-spark-m)" />
      <path d={line} fill="none" stroke={t.accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {pts.filter((_, i) => i % 2 === 0).map((p, idx) => (
        <text key={idx} x={p.x} y={H} textAnchor="middle" fill={t.inkSecondary} fontFamily={t.mono} fontSize="8">
          W{idx * 2 + 1}
        </text>
      ))}
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={t.accent} />
      <text
        x={pts[pts.length - 1].x - 5}
        y={pts[pts.length - 1].y - 5}
        textAnchor="end"
        fill={t.accent}
        fontFamily={t.mono}
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
        border: `1px solid ${t.darkBorder}`,
        boxShadow:
          '0 2px 0 rgba(48,44,36,0.4), 0 22px 54px -26px rgba(0,0,0,0.6), 0 44px 96px -48px rgba(123,45,38,0.22)',
        overflow: 'hidden',
      }}
    >
      {/* ── App header ──────────────────────────────────────────────────────── */}
      <div style={{ background: t.darkBg, borderBottom: `1px solid ${t.darkBorder}` }}>
        {/* Nav bar */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 20px', borderBottom: `1px solid ${t.darkBorder}`,
            flexWrap: 'wrap', gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: t.mono, fontSize: '12.5px', letterSpacing: '0.1em', color: t.darkBright,
                padding: '11px 20px 11px 0', borderRight: `1px solid ${t.darkBorder}`, marginRight: '20px',
              }}
            >
              unauth
            </span>
            {['Overview', 'Cases', 'Clusters', 'Audits', 'Reports'].map((n, i) => (
              <span
                key={n}
                style={{
                  fontFamily: t.sans, fontSize: '12.5px',
                  color: i === 1 ? t.darkBright : t.darkSubtle,
                  padding: '11px 14px',
                  borderBottom: i === 1 ? `2px solid ${t.accent}` : '2px solid transparent',
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
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.greenBright, display: 'inline-block' }} />
              <span style={{ fontFamily: t.mono, fontSize: '9.5px', color: t.darkSubtle, letterSpacing: '0.06em' }}>GRAPH LIVE</span>
            </div>
            <span style={{ width: 1, height: 14, background: t.darkBorder, display: 'inline-block' }} />
            <span style={{ fontFamily: t.sans, fontSize: '12.5px', fontWeight: 500, color: t.inkTertiary }}>Kessler.com</span>
            <span style={{ width: 1, height: 14, background: t.darkBorder, display: 'inline-block' }} />
            <span style={{ fontFamily: t.mono, fontSize: '9.5px', color: t.darkSubtle, letterSpacing: '0.06em' }}>MAY 2026</span>
            <button
              style={{
                fontFamily: t.mono, fontSize: '9.5px', color: t.accent,
                background: `${t.accent}1A`, border: `1px solid ${t.accent}40`,
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
            { label: 'Total exposure',   value: '$2,760',          sub: 'across 4 active cases',  trend: '↑ 18%',  tC: t.orange },
            { label: 'Orders matched',   value: '11',              sub: 'this audit cycle',        trend: '↑ 4',    tC: t.inkTertiary        },
            { label: 'Cases open',       value: `${openCases}`,    sub: '2 need action',           trend: null,     tC: null      },
            { label: 'Evidence ready',   value: `${evidenceReady}`,sub: 'packet assembled',        trend: '→',      tC: t.accent    },
            { label: 'Avg refund rate',  value: '62%',             sub: 'vs 18% at cycle start',   trend: '↑ 44pp', tC: t.orange },
          ].map((k, i) => (
            <div key={i} style={{ padding: '13px 18px', borderRight: i < 4 ? `1px solid ${t.darkBorder}` : 'none' }}>
              <div
                style={{
                  fontFamily: t.mono, fontSize: '8px', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: t.inkSecondary, marginBottom: '5px',
                }}
              >
                {k.label}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
                <span
                  style={{
                    fontFamily: t.sans,
                    fontSize: 'clamp(20px, 2.2vw, 26px)',
                    fontWeight: 500, letterSpacing: '-0.03em',
                    color: k.tC ?? t.darkBright,
                    lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {k.value}
                </span>
                {k.trend && (
                  <span style={{ fontFamily: t.mono, fontSize: '9px', color: k.tC ?? t.darkSubtle }}>{k.trend}</span>
                )}
              </div>
              <div style={{ fontFamily: t.mono, fontSize: '8px', color: t.inkSecondary, marginTop: '3px' }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 272px', background: t.darkBg }}
        className="ua-dash-grid"
      >
        {/* LEFT — case list */}
        <div style={{ borderRight: `1px solid ${t.darkBorder}` }}>
          {/* Section header */}
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderBottom: `1px solid ${t.darkBorder}`,
              background: t.darkShell2, gap: '10px', flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: t.inkTertiary }}>
                Cases
              </span>
              <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.darkSubtle }}>
                {CASES.length} total · {openCases} open
              </span>
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              {['ALL', 'DEFINITE', 'POSSIBLE', 'WATCH'].map((f, i) => (
                <span
                  key={f}
                  style={{
                    fontFamily: t.mono, fontSize: '8.5px', letterSpacing: '0.07em',
                    padding: '3px 9px', cursor: 'pointer',
                    background: i === 0 ? t.darkBorder : 'transparent',
                    color: i === 0 ? t.darkWarm : t.darkSubtle,
                    border: `1px solid ${i === 0 ? t.darkBorder : t.darkBorder}`,
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
              padding: '8px 14px', background: t.darkShell2, borderTop: `1px solid ${t.darkBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontFamily: t.mono, fontSize: '8.5px', color: t.inkSecondary }}>
              Audit: 2026-05-20 09:42 EST · 11 rows · 38ms
            </span>
            <span style={{ fontFamily: t.mono, fontSize: '8.5px', color: t.inkSecondary }}>
              k ≥ 3 gate · HMAC-SHA256
            </span>
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>

          {/* Cluster network exposure */}
          <div style={{ background: t.darkShell2, borderBottom: `1px solid ${t.darkBorder}` }}>
            <ClusterNetwork />
          </div>

          {/* Activity feed */}
          <div>
            <div
              style={{
                padding: '9px 14px', background: t.cardHd, borderBottom: `1px solid ${t.darkBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.inkTertiary }}>
                Activity
              </span>
              <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.darkSubtle, letterSpacing: '0.06em' }}>LIVE</span>
            </div>
            <div style={{ background: t.darkBg, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ACTIVITY.map((a, i) => <ActivityCard key={i} a={a} />)}
            </div>
          </div>

          {/* Top signals */}
          <div style={{ background: t.darkShell2, borderTop: `1px solid ${t.darkBorder}`, borderBottom: `1px solid ${t.darkBorder}` }}>
            <div style={{ padding: '9px 14px', borderBottom: `1px solid ${t.darkBorder}` }}>
              <span style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.inkTertiary }}>
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
                      fontFamily: t.mono, fontSize: '9px', color: t.darkSubtle,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {s.l}
                  </span>
                  <div style={{ height: '2px', background: t.darkBorder }}>
                    <div style={{ width: `${s.v * 100}%`, height: '100%', background: t.accent }} />
                  </div>
                  <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.darkSubtle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {s.cases}×
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Refund rate sparkline */}
          <div style={{ background: t.darkBg, flex: 1 }}>
            <div
              style={{
                padding: '9px 14px', background: t.darkShell2, borderBottom: `1px solid ${t.darkBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span style={{ fontFamily: t.mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: t.inkTertiary }}>
                Refund rate
              </span>
              <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.inkSecondary }}>8-week trend</span>
            </div>
            <div style={{ padding: '10px 14px 4px' }}>
              <TrendSparkline />
            </div>
            <div style={{ padding: '0 14px 10px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: t.mono, fontSize: '8.5px', color: t.inkSecondary }}>18% → 62%</span>
              <span style={{ fontFamily: t.mono, fontSize: '8.5px', color: t.accent }}>+44pp ↑</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: t.darkShell2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 20px', borderTop: `1px solid ${t.darkBorder}`,
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
            <span key={label} style={{ fontFamily: t.mono, fontSize: '9px', color: t.inkSecondary, letterSpacing: '0.06em' }}>
              {label} <span style={{ color: t.inkTertiary }}>{value}</span>
            </span>
          ))}
        </div>
        <span style={{ fontFamily: t.mono, fontSize: '9px', color: t.inkSecondary, letterSpacing: '0.06em' }}>
          HMAC-SHA256 MATCHING · MERCHANT-SCOPED DATA · SOC 2 IN PROGRESS
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
