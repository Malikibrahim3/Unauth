// Landing body ported from the approved design canvas (F5jdcuJtiynGy8woDUYkuK, v4).
// Presentation only: launch-state facts come from lib/demo/merchantCaseV1; no data or actions.

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { DEMO_LAUNCH_STORY, DEMO_SOURCE_PRESENTATION, demoUrl } from '@/lib/demo/merchantCaseV1';
import { formatMoney } from '@/lib/utils/format';
import { CardExpand } from './LandingCardExpand';
import styles from './landingCanvas.module.css';

const launch = DEMO_LAUNCH_STORY;
const demo = demoUrl(launch.caseId);
const gbp = (minor: number) => formatMoney(minor, launch.currency);
const refund = gbp(launch.customerResolution.amount);
const recoveryCeiling = gbp(launch.recoveryAgreement.ceiling);
const reviewThreshold = gbp(launch.customerPolicy.proposedRefundReview.amount);
const recovered = gbp(launch.money.recovered);
const unrecoveredRefundBalance = gbp(launch.money.unrecoveredRefundBalance);
const priorRefunds = gbp(launch.evidence.priorRefund);
const eventDay = (timestamp: string) => timestamp.split(' · ')[0];
const recoveryStages = [
  { label: 'Prepared', at: launch.recovery.blockedAt, state: 'claim' },
  { label: 'Submitted', at: launch.recovery.submittedAt, state: 'claim' },
  { label: 'Approved', at: launch.recovery.approvedAt, state: 'approved' },
  { label: 'Received', at: launch.recovery.receivedAt, state: 'money' },
  { label: 'Matched', at: launch.recovery.matchedAt, state: 'money' },
  { label: 'Reconciled', at: launch.recovery.reconciledAt, state: 'money' },
] as const;

/* Shared roles for this composition (DESIGN.md › Colors). */
const INK = '#1c1f23';
const MUTED = '#64686d';
const RULE = '#e4e3e0';
const HAIR = '#f0efec';
const PAPER = '#f4f3f1';
const TINT = '#fbfaf9';
const f = (weight: number, size: number, line: number) => `${weight} ${size}px/${line}px Inter,sans-serif`;
const SHADOW_CHIP = '0 1px 2px rgba(28,31,35,0.06),0 0 0 1px rgba(28,31,35,0.04)';
const SHADOW_DOC = '0 0 0 1px rgba(28,31,35,0.04),0 2px 4px rgba(28,31,35,0.03),0 16px 40px -12px rgba(28,31,35,0.16)';
const DOTS: CSSProperties = { backgroundImage: 'radial-gradient(rgba(28,31,35,0.12) 1px, transparent 1.4px)', backgroundSize: '16px 16px' };
const container: CSSProperties = { maxWidth: '1440px', margin: '0 auto', padding: '0 64px', boxSizing: 'border-box' };
const paperCard: CSSProperties = { position: 'relative', overflow: 'hidden', border: `1px solid ${RULE}`, borderRadius: '12px', background: PAPER };
const docSheet: CSSProperties = { overflow: 'hidden', border: `1px solid ${RULE}`, borderRadius: '10px', background: '#ffffff', boxShadow: '0 12px 32px -20px rgba(28,31,35,0.18)' };
const chip: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '8px', minHeight: '34px', padding: '0 13px', boxSizing: 'border-box', borderRadius: '9px', background: '#ffffff', boxShadow: SHADOW_CHIP, font: f(400, 14, 20) };
const flowChip: CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: '42px', padding: '0 15px', boxSizing: 'border-box', borderRadius: '10px', background: '#ffffff', boxShadow: SHADOW_CHIP, font: f(400, 15, 20) };
const docHead: CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', minHeight: '48px', padding: '14px 22px', boxSizing: 'border-box', borderBottom: `1px solid ${RULE}`, background: TINT, font: f(400, 12, 20), color: MUTED };
const buttonBase: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '10px', minHeight: '48px', padding: '14px 20px', boxSizing: 'border-box', borderRadius: '6px', color: INK, font: f(500, 16, 20), textDecoration: 'none' };

const ICON = {
  forward: 'M5 12h14M13 6l6 6-6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  external: 'M7 17 17 7M8 7h9v9',
  chevronDown: 'm6 9 6 6 6-6',
  chevronRight: 'm10 7 5 5-5 5',
  upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
  extract: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M9 13h6M9 17h4',
  review: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  check: 'm5 12 4 4L19 6',
  refunded: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M9 14l2 2 4-4',
  terms: 'M8 3v3M16 3v3M4.5 9h15M5.5 5h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8.5 13h2M8.5 16.5h5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  document: 'M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8M8 16h5',
} as const;

function Glyph({ d, size = 16, stroke = 1.7, icon, style }: { d: string; size?: number; stroke?: number; icon?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-icon={icon} style={{ flex: 'none', ...style }}><path d={d} /></svg>;
}

function Check({ size = 16, style }: { size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: 'none', ...style }}><circle cx="8" cy="8" r="8" fill="#e5f2ea" /><path d="m4.8 8.2 2.1 2.1 4.3-4.5" stroke="#1a6b43" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function GateMark({ size = 14, color = INK }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ flex: 'none' }}><g stroke={color} strokeWidth="8"><path d="M16 8V18" /><path d="M16 26v10a16 16 0 0 0 32 0V8" /></g></svg>;
}

function Dot({ color = '#ff7a30', size = 6 }: { color?: string; size?: number }) {
  return <span aria-hidden="true" style={{ flex: 'none', width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: color }} />;
}

const pillTones = {
  positive: { background: '#eef6f1', color: '#1a6b43' },
  review: { background: '#fff3e9', color: '#7a5310' },
  critical: { background: '#fbe9e6', color: '#9b2c1c' },
  neutral: { background: PAPER, color: INK },
  accent: { background: '#fff1e8', color: INK },
} as const;

function Pill({ tone, children, style }: { tone: keyof typeof pillTones; children: ReactNode; style?: CSSProperties }) {
  return <span style={{ flex: 'none', padding: '2px 8px', borderRadius: '5px', font: f(500, 12, 18), whiteSpace: 'nowrap', ...pillTones[tone], ...style }}>{children}</span>;
}

function Avatar({ initials, tone = 'violet', size = 24 }: { initials: string; tone?: 'violet' | 'green' | 'blue'; size?: number }) {
  const palette = { violet: ['#e6e2f0', '#4c4470'], green: ['#dcebe1', '#1a6b43'], blue: ['#e2e8f2', '#3b4f70'] }[tone];
  return <span aria-hidden="true" style={{ flex: 'none', display: 'grid', placeItems: 'center', width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: palette[0], font: f(500, size > 26 ? 11 : 10, 1), color: palette[1] }}>{initials}</span>;
}

function SplitHeading({ title, rest, children }: { title: string; rest: string; children: ReactNode }) {
  return <div data-lr="split" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '48px', alignItems: 'end' }}>
    <h2 style={{ margin: '0', font: f(400, 40, 42), letterSpacing: '-0.03em', textWrap: 'balance' }}>{title}<span style={{ display: 'block', color: MUTED }}>{rest}</span></h2>
    <p style={{ margin: '0 0 3px', maxWidth: '40ch', font: f(400, 18, 28), color: MUTED }}>{children}</p>
  </div>;
}

function Statement({ title, rest, width, children }: { title: string; rest: string; width: number; children: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
    <h2 style={{ margin: '0', font: f(400, 48, 50), letterSpacing: '-0.035em', textWrap: 'balance' }}>{title}<span style={{ display: 'block', color: MUTED }}>{rest}</span></h2>
    <p style={{ margin: '20px 0 0', maxWidth: `${width}px`, font: f(400, 18, 28), color: MUTED, textWrap: 'balance' }}>{children}</p>
  </div>;
}

function CardHead({ id, title, rest }: { id: string; title: string; rest: ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', padding: '30px 30px 0' }}>
    <h3 style={{ margin: '0', maxWidth: '29ch', paddingTop: '2px', font: f(400, 24, 28), letterSpacing: '-0.025em', textWrap: 'balance' }}>{title} <span style={{ color: MUTED }}>{rest}</span></h3>
    <CardExpand id={id} />
  </div>;
}

function Row({ label, children, last = false }: { label: string; children: ReactNode; last?: boolean }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '8px 0', borderBottom: last ? undefined : `1px solid ${RULE}`, font: f(400, 12, 19) }}><span style={{ color: MUTED }}>{label}</span><span style={{ textAlign: 'right' }}>{children}</span></div>;
}

function SourceColumn({ logo, label, title, children, footnote, first = false }: { logo: ReactNode; label: string; title: string; children: ReactNode; footnote: string; first?: boolean }) {
  return <div style={{ display: 'flex', flexDirection: 'column', minWidth: '0', padding: '26px 24px 22px', borderLeft: first ? undefined : `1px solid ${RULE}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', height: '30px', marginBottom: '26px' }}>{logo}</div>
    <span style={{ font: f(400, 11, 18), color: MUTED }}>{label}</span>
    <h5 data-source-title style={{ margin: '7px 0 18px', font: f(450, 19, 24), letterSpacing: '-0.025em' }}>{title}</h5>
    {children}
    <div style={{ marginTop: 'auto', paddingTop: '14px', font: f(400, 11, 18), color: MUTED }}>{footnote}</div>
  </div>;
}

/** A single source record, used where records stack rather than sit in columns. */
function RecordSheet({ logo, label, title, children, footnote }: { logo: ReactNode; label: string; title: string; children: ReactNode; footnote: string }) {
  return <div style={{ ...docSheet, padding: '20px 22px 16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px 12px', minHeight: '28px' }}>{logo}<span style={{ font: f(400, 11, 18), color: MUTED }}>{label}</span></div>
    <h5 style={{ margin: '14px 0 8px', font: f(450, 19, 24), letterSpacing: '-0.025em' }}>{title}</h5>
    {children}
    <div style={{ paddingTop: '12px', font: f(400, 11, 18), color: MUTED }}>{footnote}</div>
  </div>;
}

/** Custody passing from the warehouse record to the carrier record. */
function Handoff() {
  return <div aria-hidden="true" style={{ position: 'relative', display: 'flex', justifyContent: 'center', height: '30px' }}>
    <span style={{ position: 'absolute', top: '0', bottom: '0', left: '50%', width: '1px', background: '#cdcac4' }} />
    <span style={{ position: 'relative', alignSelf: 'center', display: 'grid', placeItems: 'center', width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', boxShadow: SHADOW_CHIP, color: MUTED }}><Glyph d={ICON.down} size={12} stroke={1.8} /></span>
  </div>;
}

function Condition({ title, detail }: { title: string; detail: string }) {
  return <div style={{ display: 'flex', gap: '10px' }}><Check style={{ marginTop: '2px' }} /><div><div style={{ font: f(400, 13, 20) }}>{title}</div><div style={{ font: f(400, 12, 18), color: MUTED }}>{detail}</div></div></div>;
}

function FlowIcon({ d, dark = false }: { d: string; dark?: boolean }) {
  return <span style={{ flex: 'none', display: 'grid', placeItems: 'center', width: '32px', height: '32px', marginRight: dark ? undefined : '2px', borderRadius: '7px', background: dark ? INK : '#e4e2de', color: dark ? '#ffffff' : MUTED }}><Glyph d={d} size={16} /></span>;
}

function FlowTick() {
  return <>
    <span data-flow-tick aria-hidden="true" style={{ position: 'absolute', left: '16px', top: '50%', width: '26px', height: '1px', background: '#cdcac4' }} />
    <svg data-flow-tick width="7" height="9" viewBox="0 0 7 9" style={{ position: 'absolute', left: '41px', top: 'calc(50% - 4.5px)' }} aria-hidden="true"><path d="M0 0 7 4.5 0 9Z" fill="#cdcac4" /></svg>
  </>;
}

function FlowResult({ children }: { children: ReactNode }) {
  return <span data-flow-result style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginLeft: '6px', font: f(400, 12.5, 18), color: MUTED, whiteSpace: 'nowrap' }}><Check />{children}</span>;
}

function CaseCard({ label, reference, title, visual, visualLabel, checks, decision, spotlight = false }: { label: string; reference: string; title: string; visual: ReactNode; visualLabel: string; checks: readonly string[]; decision: string; spotlight?: boolean }) {
  return <div data-card="third" style={{ display: 'flex', flexDirection: 'column', minWidth: '0', padding: '26px 28px 28px', border: `1px solid ${RULE}`, borderRadius: '12px', background: '#ffffff' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingBottom: '18px', borderBottom: `1px solid ${RULE}` }}>
      <div style={{ minWidth: '0' }}><span style={{ display: 'block', font: f(600, 14, 20) }}>{label}</span><span style={{ display: 'block', marginTop: '2px', font: f(500, 12, 16), color: MUTED }}>{reference}</span></div>
      <CardExpand id={label} />
    </div>
    <h3 data-case-title style={{ margin: '24px 0 20px', font: f(400, 22, 29), letterSpacing: '-0.02em', textWrap: 'balance' }}>{title}</h3>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '44px', margin: '0 0 20px' }}>{visual}<span style={{ font: f(400, 12, 18), color: MUTED }}>{visualLabel}</span></div>
    <div style={{ margin: '0 0 22px', paddingTop: '16px', borderTop: `1px solid ${RULE}` }}>
      <span style={{ display: 'block', marginBottom: '11px', font: f(400, 11, 17), color: MUTED }}>Evidence matched</span>
      <div style={{ display: 'grid', gap: '9px', font: f(400, 12.5, 19) }}>
        {checks.map((check) => <div key={check} style={{ display: 'flex', gap: '9px' }}><Check size={14} style={{ marginTop: '2.5px' }} />{check}</div>)}
      </div>
    </div>
    <div style={{ marginTop: 'auto', padding: '17px 18px 19px', borderRadius: '8px', background: spotlight ? '#ffefe6' : PAPER }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', font: f(400, 12, 18), color: MUTED }}><Dot />Unauth decides</span>
      <strong style={{ display: 'block', marginTop: '9px', font: f(500, 22, 29), letterSpacing: '-0.025em' }}>{decision}</strong>
    </div>
  </div>;
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} width="44" height="44" style={{ display: 'block', flex: 'none', width: '44px', height: '44px', borderRadius: '8px', border: '1px solid #ecebe8', objectFit: 'cover' }} />;
}

function EvidenceLine({ title, source, last = false }: { title: string; source: string; last?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minHeight: '38px', borderBottom: last ? undefined : `1px solid ${HAIR}` }}><span style={{ color: MUTED, display: 'flex' }}><Glyph d={ICON.document} size={15} stroke={1.6} /></span><span style={{ flex: '1', font: f(400, 13, 19) }}>{title}</span><span style={{ font: f(400, 12, 18), color: MUTED }}>{source}</span><Check /></div>;
}

function WorkRow({ context, task, initials, tone, owner, status, last = false }: { context: string; task: string; initials: string; tone: 'violet' | 'green' | 'blue'; owner: string; status: ReactNode; last?: boolean }) {
  return <div data-lr="table" data-cols="work" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 108px 64px', alignItems: 'center', gap: '10px', minHeight: '60px', padding: '0 22px', borderBottom: last ? undefined : `1px solid ${HAIR}` }}>
    <div style={{ minWidth: '0' }}><div style={{ font: f(400, 11.5, 16), color: MUTED }}>{context}</div><div style={{ font: f(400, 13.5, 19) }}>{task}</div></div>
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', font: f(400, 12.5, 18) }}><Avatar initials={initials} tone={tone} />{owner}</span>
    <span style={{ textAlign: 'right' }}>{status}</span>
  </div>;
}

function PreviewRow({ reference, amount, escalates, last = false }: { reference: string; amount: string; escalates: boolean; last?: boolean }) {
  return <div data-lr="table" data-cols="preview" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 84px 118px', alignItems: 'center', minHeight: '42px', padding: '0 22px', borderBottom: `1px solid ${last ? RULE : HAIR}`, background: escalates ? '#fffaf6' : undefined, font: f(400, 12.5, 18) }}>
    <span>{reference}</span><span>{amount}</span>
    <span>{escalates ? <Pill tone="review" style={{ font: f(500, 12, 18) }}>Now escalates</Pill> : <span style={{ color: MUTED }}>No change</span>}</span>
  </div>;
}

const historyKinds = {
  decision: { background: INK },
  blocked: { background: '#ff7a30' },
  approved: { background: '#ffffff', boxShadow: `inset 0 0 0 2px ${INK}` },
  money: { background: '#2f8f5b' },
} as const;

function HistoryRow({ at, kind, children, first = false, last = false }: { at: string; kind: keyof typeof historyKinds; children: ReactNode; first?: boolean; last?: boolean }) {
  return <div data-lr="table" data-cols="history" style={{ display: 'grid', gridTemplateColumns: '92px 12px minmax(0,1fr)', columnGap: '10px', font: f(400, 12.5, 18) }}>
    <span style={{ color: MUTED, whiteSpace: 'nowrap' }}>{at.replace(' · ', ' ')}</span>
    <span aria-hidden="true" data-hide-phone style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
      <span style={{ position: 'absolute', left: '5.5px', top: first ? '9px' : '-6px', bottom: last ? 'auto' : '-6px', height: last ? '9px' : undefined, width: '1px', background: RULE }} />
      <span style={{ position: 'relative', width: '8px', height: '8px', marginTop: '5px', borderRadius: '50%', boxShadow: '0 0 0 3px #ffffff', ...historyKinds[kind] }} />
    </span>
    <span style={{ paddingBottom: last ? undefined : '12px' }}>{children}</span>
  </div>;
}

export function LandingCanvasBody() {
  return <div className={styles.page}>
{/* ============ HERO (last build + Ramp stage) ============ */}
<section id="top" style={{padding:"80px 0 0"}}>
<div data-lr="container" style={container}>
<h1 style={{margin:"0",font:f(400,64,64),letterSpacing:"-0.035em"}}><span style={{display:"block"}}>Your rules before money moves.</span><span style={{display:"block"}}>Recover what you’re owed.</span></h1>
<p style={{margin:"24px 0 0",maxWidth:"790px",font:f(400,20,30),color:MUTED,textWrap:"pretty"}}>Orders that never arrive. Customers demanding refunds. Carrier claims left unpaid. Unauth decides the outcome under your rules and keeps recovery moving.</p>
<div data-hero-actions style={{display:"flex",alignItems:"center",gap:"12px",marginTop:"30px"}}>
<a href={demo} data-btn="primary" style={{...buttonBase,background:"#ff7a30"}}>See it in action<Glyph d={ICON.forward} icon="forward" /></a>
<a href="#workflow" data-btn="secondary" style={{...buttonBase,background:PAPER}}>How it works<Glyph d={ICON.down} icon="down" /></a>
</div>

<figure style={{margin:"48px 0 0"}}>
<div style={{position:"relative",overflow:"hidden",padding:"64px 128px 0",borderRadius:"12px",backgroundColor:PAPER,backgroundImage:"radial-gradient(rgba(28,31,35,0.13) 1px, transparent 1.4px)",backgroundSize:"16px 16px"}}>
<div style={{position:"relative",overflow:"hidden",borderRadius:"12px 12px 0 0",background:"#ffffff",boxShadow:"0 0 0 1px rgba(28,31,35,0.07),0 24px 60px -24px rgba(28,31,35,0.26)"}}>
<div style={{position:"relative",display:"flex",alignItems:"center",height:"36px",padding:"0 14px",borderBottom:"1px solid #eeede9",background:TINT}}>
<span style={{display:"flex",gap:"6px"}}><span style={{width:"9px",height:"9px",borderRadius:"50%",background:"#dcdad5"}}></span><span style={{width:"9px",height:"9px",borderRadius:"50%",background:"#dcdad5"}}></span><span style={{width:"9px",height:"9px",borderRadius:"50%",background:"#dcdad5"}}></span></span>
<span style={{position:"absolute",left:"0",right:"0",textAlign:"center",font:f(400,12,36),color:"#8a8d91"}}>Unauth</span>
</div>
<img src="/landing/asterlane-overview-live-2026-09-23.jpg" alt="Fictional Asterlane workspace in Unauth: financial position, recovery stages, work needing attention and record freshness." style={{display:"block",width:"100%",height:"auto"}} />
</div>

{/* Policy decision, overlapping the window like Ramp's card and phone */}
<div data-hero-card style={{position:"absolute",left:"40px",bottom:"40px",width:"404px",overflow:"hidden",borderRadius:"12px",background:"#ffffff",boxShadow:"0 0 0 1px rgba(28,31,35,0.07),0 2px 6px rgba(28,31,35,0.05),0 28px 64px -18px rgba(28,31,35,0.34)"}}>
<div style={{display:"flex",alignItems:"center",gap:"9px",minHeight:"44px",padding:"0 16px",borderBottom:`1px solid ${RULE}`,background:TINT}}>
<GateMark size={13} />
<span style={{font:f(500,13,16),whiteSpace:"nowrap"}}>Policy decision</span>
<span style={{font:f(400,12,16),color:MUTED,whiteSpace:"nowrap"}}>{launch.reference}</span>
<span style={{marginLeft:"auto",font:f(400,12,16),color:MUTED,whiteSpace:"nowrap"}}>{launch.customerResolution.decidedAt}</span>
</div>
<div style={{display:"flex",alignItems:"center",gap:"12px",padding:"14px 16px 8px"}}>
<img src="/demo/items/wool-coat.jpg" alt="" width="40" height="40" style={{display:"block",width:"40px",height:"40px",borderRadius:"7px",border:"1px solid #ecebe8",objectFit:"cover"}} />
<div style={{flex:"1",minWidth:"0"}}><div style={{font:f(500,14,20)}}>Item not received</div><div style={{font:f(400,12.5,18),color:MUTED}}>{launch.item} · {launch.sku} · Qty 1</div></div>
<div style={{font:f(500,14,20)}}>{refund}</div>
</div>
<div style={{display:"flex",flexDirection:"column",padding:"2px 16px 12px"}}>
{([
  ['Carrier', 'Loss confirmed after collection'],
  ['3PL', `Handed to the carrier on ${eventDay(launch.evidence.handedToCarrierAt)}`],
  ['Store', 'No earlier refund on this item'],
  ['Policy', `${refund} refund, review only above ${reviewThreshold}`],
] as const).map(([label, value]) => <div key={label} style={{display:"flex",alignItems:"center",gap:"10px",minHeight:"29px"}}><Check /><span style={{width:"64px",flex:"none",font:f(400,12.5,18),color:MUTED}}>{label}</span><span style={{font:f(400,12.5,18)}}>{value}</span></div>)}
</div>
<div style={{display:"grid",gridTemplateColumns:"64px minmax(0,1fr) auto",alignItems:"start",columnGap:"12px",rowGap:"10px",padding:"13px 16px 14px",borderTop:`1px solid ${RULE}`,background:TINT}}>
<span style={{font:f(400,12,20),color:MUTED}}>Customer</span>
<span style={{font:f(500,14,20)}}>Refund issued</span>
<span style={{font:f(500,14,20),textAlign:"right"}}>{refund}</span>
<span style={{font:f(400,12,20),color:MUTED}}>Recovery</span>
<span style={{display:"flex",alignItems:"flex-start",gap:"7px",minWidth:"0"}}><span style={{display:"flex",height:"20px",alignItems:"center"}}><Dot size={7} /></span><span><span style={{display:"block",font:f(500,14,20)}}>Claim blocked</span><span style={{display:"block",font:f(400,12,17),color:MUTED}}>Owner assigned</span></span></span>
<span style={{font:f(400,13,20),textAlign:"right",whiteSpace:"nowrap"}}>up to {recoveryCeiling}</span>
</div>
</div>
</div>
<figcaption style={{display:"flex",justifyContent:"flex-end",paddingTop:"12px"}}>
<a href="/landing/asterlane-overview-live-2026-09-23.jpg" target="_blank" rel="noreferrer" data-link style={{display:"inline-flex",alignItems:"center",gap:"6px",minHeight:"32px",font:f(400,14,22),color:MUTED,textDecoration:"none"}}>View full-size image<Glyph d={ICON.external} size={15} stroke={1.6} /></a>
</figcaption>
</figure>
</div>
</section>

{/* ============ EVIDENCE (last build: the order never arrived) ============ */}
<section id="workflow" style={{marginTop:"120px"}}>
<div data-lr="container" style={container}>
<Statement title="The order never arrived." rest={`Your ${refund} refund.`} width={620}>The customer has paid and received nothing. Your policy resolves the {refund} customer refund, while the separate carrier agreement supports recovery up to {recoveryCeiling}.</Statement>

<div data-lr="duo" style={{display:"grid",gridTemplateColumns:"minmax(0,7fr) minmax(0,5fr)",gap:"24px",alignItems:"stretch",marginTop:"48px"}}>

<div data-card="half" id="product" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="The claim" title="The claim." rest="What was ordered and reported." />
<div style={{flex:"1",display:"flex",flexDirection:"column",justifyContent:"flex-start",padding:"36px 32px 32px"}}>
<div style={docSheet}>
<div data-stack-phone style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px 24px",padding:"26px 26px 24px",borderBottom:`1px solid ${RULE}`}}>
<div>
<span style={{display:"block",font:f(400,11,18),color:MUTED}}>{launch.reference} · Customer claim</span>
<h4 style={{margin:"10px 0 8px",font:f(400,30,36),letterSpacing:"-0.035em"}}>Item not received</h4>
<p style={{margin:"0",font:f(400,13,21),color:MUTED}}>{launch.item} <span style={{padding:"0 6px"}}>·</span> {refund} refund request</p>
</div>
<span style={{flex:"none",display:"flex",alignItems:"center",gap:"8px",padding:"8px 11px",border:`1px solid ${RULE}`,borderRadius:"6px",font:f(400,12,18)}}><Dot />Refund requested</span>
</div>
<div data-lr="sources" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))"}}>
<SourceColumn first logo={<img src="/providers/shopify-dark-wordmark.svg" alt="Shopify" style={{display:"block",height:"26px",width:"auto"}} />} label={`Order record · ${launch.reference}`} title="What was ordered" footnote={`Paid ${launch.evidence.paidAt}`}>
<div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"14px"}}><img src="/demo/items/wool-coat.jpg" alt="Wool coat" width="48" height="48" style={{display:"block",width:"48px",height:"48px",borderRadius:"8px",border:"1px solid #ecebe8",objectFit:"cover"}} /><div><div style={{font:f(500,13,19)}}>{launch.item}</div><div style={{font:f(400,12,18),color:MUTED}}>{launch.sku} · Qty 1</div></div></div>
<Row label="Order value">{refund}</Row>
<Row label="Previous refunds">{priorRefunds}</Row>
</SourceColumn>
<SourceColumn logo={<img src="/providers/gorgias-wordmark.svg" alt="Gorgias" style={{display:"block",height:"24px",width:"auto"}} />} label={`Customer report · ${launch.reference}`} title="What the customer reported" footnote="Nothing received · full refund requested">
<blockquote style={{margin:"0",padding:"12px 14px 13px",borderRadius:"4px 14px 14px 14px",background:PAPER,font:f(400,14,21)}}>{DEMO_SOURCE_PRESENTATION.message}</blockquote>
</SourceColumn>
</div>
</div>
</div>
</div>

<div data-card="half" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="The records" title="The records." rest="Evidence and gaps together." />
<div style={{flex:"1",display:"flex",flexDirection:"column",justifyContent:"flex-start",padding:"36px 32px 32px"}}>
<RecordSheet logo={<img src="/providers/shipbob-wordmark.svg" alt="ShipBob" style={{display:"block",height:"22px",width:"auto"}} />} label={`3PL record · ${launch.reference}`} title="What left the warehouse" footnote="Handover confirmed">
<Row label="Packed">{launch.evidence.packedAt}</Row>
<Row label="Handed to carrier">{launch.evidence.handedToCarrierAt}</Row>
<Row label="Contents">{launch.sku} × 1</Row>
</RecordSheet>
<Handoff />
<RecordSheet logo={<span style={{display:"flex",alignItems:"center",gap:"8px"}}><Glyph d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l10 4" size={19} stroke={1.5} /><span style={{font:f(500,18,22),letterSpacing:"-0.03em"}}>Carrier</span></span>} label={`Carrier record · ${launch.reference}`} title="What the carrier record shows" footnote="Evidence supports a carrier claim">
<Row label="Collection scan">Collected {launch.evidence.collectedAt}</Row>
<Row label="Delivery scan"><span style={{display:"inline-flex",alignItems:"center",gap:"6px"}}><span aria-hidden="true" style={{width:"8px",height:"8px",borderRadius:"50%",border:"1px dashed #a9a6a0"}}></span>{launch.evidence.deliveryScan}</span></Row>
<Row label="Investigation">Loss confirmed {launch.evidence.lossConfirmedAt}</Row>
</RecordSheet>
</div>
</div>

</div>

{/* Your policy applied → Unauth decision, across the page */}
<div data-card="wide" style={{...paperCard,marginTop:"24px"}}>
<CardHead id="The decision" title="The decision." rest="Two separate outcomes." />
<div style={{padding:"36px 32px 32px"}}>
<div style={docSheet}>
<div data-lr="verdict" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 420px"}}>
<div style={{padding:"26px 26px 28px"}}>
<div style={{display:"flex",alignItems:"baseline",flexWrap:"wrap",gap:"4px 12px",marginBottom:"20px"}}><span style={{font:f(500,14,20)}}>Your policy applied</span><span style={{font:f(400,12,18),color:MUTED}}>4 of 4 conditions matched</span></div>
<div data-lr="conds" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"18px 32px"}}>
<Condition title="3PL handed it to the carrier" detail="Custody passed to the carrier" />
<Condition title="Carrier confirms loss after collection" detail="Refund allowed" />
<Condition title="No earlier refund on this order" detail="No duplicate payout" />
<Condition title={`${refund} refund is not above your ${reviewThreshold} review limit`} detail="Runs automatically because every required condition passed" />
</div>
</div>
<div style={{display:"flex",flexDirection:"column",padding:"26px 26px 24px",borderLeft:`1px solid ${RULE}`,background:TINT}}>
<div style={{display:"flex",alignItems:"center",gap:"9px",marginBottom:"8px"}}><GateMark /><span style={{font:f(500,14,20)}}>Unauth decision</span></div>
{([
  ['Customer outcome', `Refund ${refund}`, <Pill key="issued" tone="positive">Issued</Pill>],
  ['Recovery outcome', `Claim up to ${recoveryCeiling}`, <Pill key="blocked" tone="review">Blocked</Pill>],
] as const).map(([label, value, state], index) => <div key={label} style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:"4px 10px",minHeight:"46px",borderBottom:index === 0 ? `1px solid ${RULE}` : undefined}}>
<span style={{font:f(400,12,18),color:MUTED}}>{label}</span>
<span style={{display:"flex",alignItems:"center",gap:"8px",marginLeft:"auto"}}><strong style={{font:f(500,15.5,22),letterSpacing:"-0.01em",whiteSpace:"nowrap"}}>{value}</strong>{state}</span>
</div>)}
<div style={{marginTop:"auto",paddingTop:"10px",font:f(400,11.5,18),color:MUTED}}>{launch.customerResolution.provider} confirmed the refund. {launch.recovery.owner} must confirm the claimant and channel.</div>
</div>
</div>
</div>
</div>
</div>
</div>
</section>

{/* ============ POLICY (last build: you set the policy) ============ */}
<section id="gate" style={{marginTop:"128px"}}>
<div data-lr="container" style={container}>
<SplitHeading title="You set the policy." rest="Unauth makes the call.">Choose which evidence matters, your value thresholds and when a person must approve. Unauth checks every claim against your policy and explains the route it takes.</SplitHeading>

<div data-lr="duo" style={{display:"grid",gridTemplateColumns:"minmax(0,5fr) minmax(0,7fr)",gap:"24px",alignItems:"stretch",marginTop:"44px"}}>

{/* Setup: what Unauth is allowed to apply */}
<div data-card="half" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="Your rules" title="Your rules." rest="Approved and published by you." />
<div style={{flex:"1",display:"flex",flexDirection:"column",justifyContent:"flex-start",padding:"36px 32px 32px",...DOTS}}>
<ol data-steps style={{position:"relative",display:"flex",flexDirection:"column",gap:"16px",margin:"0",padding:"0",listStyle:"none"}}>
{launch.setupStages.map((stage, index) => {
  const last = index === launch.setupStages.length - 1;
  const glyph = [ICON.upload, ICON.extract, ICON.review, ICON.check][index];
  return <li key={stage.label} style={{position:"relative",display:"grid",gridTemplateColumns:"32px minmax(0,1fr)",columnGap:"14px",alignItems:"start"}}>
    {!last && <span aria-hidden="true" style={{position:"absolute",left:"15.5px",top:"36px",bottom:"-14px",width:"1px",background:"#cdcac4"}}></span>}
    <span style={{position:"relative",display:"grid",placeItems:"center",width:"32px",height:"32px",borderRadius:"8px",background:last ? INK : "#ffffff",color:last ? "#ffffff" : INK,boxShadow:last ? undefined : SHADOW_CHIP}}><Glyph d={glyph} size={16} stroke={1.6} /></span>
    <span style={{display:"block",minWidth:"0",paddingTop:"1px"}}>
      <span style={{display:"block",font:f(500,13.5,20)}}>{stage.label}</span>
      <span style={{display:"block",font:f(400,12.5,18),color:MUTED}}>{stage.detail}</span>
      {last && <span style={{display:"flex",flexDirection:"column",alignItems:"flex-start",gap:"8px",marginTop:"12px"}}>
        <span style={{...chip,flexWrap:"wrap",gap:"0 8px",maxWidth:"100%",padding:"6px 13px 6px 10px"}}><Check />{launch.customerPolicy.name}<span style={{color:MUTED}}>· {launch.customerPolicy.state.toLowerCase()}</span></span>
        <span style={{...chip,flexWrap:"wrap",gap:"0 8px",maxWidth:"100%",padding:"6px 13px 6px 10px"}}><Check />{launch.recoveryAgreement.name}<span style={{color:MUTED}}>· clauses reviewed · {launch.recoveryAgreement.state.toLowerCase()}</span></span>
      </span>}
    </span>
  </li>;
})}
</ol>
<p style={{margin:"24px 0 0",font:f(400,12,18),color:MUTED}}>Uploads produce reviewable candidates. Only the exact version you publish can decide a case.</p>
</div>
</div>

{/* Every input a policy can combine; dots mark the ones that decided this case */}
<div data-card="half" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="Your evidence" title="Your evidence." rest="What Unauth can use." />
<div style={{flex:"1",display:"flex",flexDirection:"column",justifyContent:"flex-start",padding:"36px 32px 32px",...DOTS}}>
<span style={{display:"inline-flex",alignItems:"center",gap:"7px",marginBottom:"14px",font:f(400,12,18),color:MUTED}}><Dot />Used to decide {launch.reference}</span>
<div data-lr="evidence" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"12px"}}>
{([
  ['Carrier status', `Lost after collection · confirmed ${launch.evidence.lossConfirmedAt}`, 'Carrier'],
  ['3PL records', `Handed to carrier · ${launch.evidence.collectedAt}`, 'ShipBob'],
  ['Refund amount', `${refund} · not above ${reviewThreshold}`, 'Shopify'],
  ['Previous refunds', `None · ${priorRefunds}`, 'Shopify'],
] as const).map(([label, value, source]) => <div key={label} style={{padding:"15px 16px 16px",borderRadius:"10px",background:"#ffffff",boxShadow:SHADOW_CHIP}}>
  <span style={{display:"flex",alignItems:"center",gap:"8px",font:f(500,14,20)}}><Dot />{label}<span style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"6px",font:f(400,11.5,16),color:MUTED}}>{source === 'Carrier' ? <Glyph d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l10 4" size={14} stroke={1.6} /> : <img src={source === 'ShipBob' ? '/providers/shipbob.svg' : '/providers/shopify.svg'} alt="" width="14" height="14" style={{display:"block",width:"14px",height:"14px",objectFit:"contain"}} />}{source}</span></span>
  <span style={{display:"flex",alignItems:"center",gap:"7px",marginTop:"6px",font:f(400,12.5,18),color:MUTED}}><Check size={14} />{value}</span>
</div>)}
</div>
<div data-lr="chips" style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:"8px",marginTop:"20px"}}>
{(['Customer history', 'Previous claims', 'Delivery proof', 'Payment records'] as const).map((label) => <span key={label} style={{...chip,color:MUTED}}>{label}</span>)}
</div>
<p style={{margin:"18px 0 0",font:f(400,15,22),color:MUTED}}>Combine available evidence into the conditions that govern each outcome.</p>
</div>
</div>

</div>

<div data-card="wide" style={{...paperCard,marginTop:"24px"}}>
<CardHead id="Your gates" title="Your gates." rest="Applied to the evidence." />
<div data-lr="policy" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 452px",gap:"40px",alignItems:"center",padding:"36px 36px 40px",...DOTS}}>

{/* Rule flow, drawn the way Ramp draws its workflows */}
<div data-flow style={{position:"relative",display:"flex",flexDirection:"column",gap:"18px",padding:"4px 0"}}>
<div data-flow-rail style={{position:"absolute",left:"15.5px",top:"26px",bottom:"26px",width:"1px",background:"#cdcac4"}}></div>

<div data-flow-row style={{position:"relative",display:"flex",alignItems:"center",gap:"12px",minHeight:"44px"}}>
<FlowIcon dark d="M4 4h16v12H8l-4 4V4Z" />
<span data-flow-chip style={flowChip}>When a customer reports an item not received</span>
</div>

<div data-flow-row style={{position:"relative",display:"flex",alignItems:"center",gap:"10px",minHeight:"44px"}}>
<FlowIcon d="M6 3v12a4 4 0 0 0 4 4h8M6 7h6a4 4 0 0 1 4 4v1M15 16l3 3-3 3" />
<span style={{font:f(400,15,20)}}>If the</span>
<span data-flow-chip style={{...flowChip,color:MUTED}}>Carrier status</span>
<span style={{font:f(400,15,20)}}>is</span>
<span data-flow-chip style={flowChip}>Lost after collection</span>
<FlowResult>Confirmed {launch.evidence.lossConfirmedAt}</FlowResult>
</div>

<div data-flow-row style={{position:"relative",display:"flex",alignItems:"center",gap:"10px",minHeight:"44px",paddingLeft:"54px"}}>
<FlowTick />
<span style={{font:f(400,15,20)}}>and the</span>
<span data-flow-chip style={{...flowChip,color:MUTED}}>3PL record</span>
<span style={{font:f(400,15,20)}}>shows</span>
<span data-flow-chip style={flowChip}>Handed to carrier</span>
<FlowResult>{launch.evidence.collectedAt}</FlowResult>
</div>

<div data-flow-row style={{position:"relative",display:"flex",alignItems:"center",gap:"10px",minHeight:"44px",paddingLeft:"54px"}}>
<FlowTick />
<span style={{font:f(400,15,20)}}>and the</span>
<span data-flow-chip style={{...flowChip,color:MUTED}}>Proposed refund</span>
<span style={{font:f(400,15,20)}}>is not above</span>
<span data-flow-chip style={flowChip}>{reviewThreshold}</span>
<FlowResult>{refund}</FlowResult>
<span data-flow-cursor aria-hidden="true" style={{position:"absolute",left:"398px",top:"27px",display:"flex",alignItems:"flex-start",gap:"2px",pointerEvents:"none"}}>
<svg width="22" height="24" viewBox="0 0 22 24"><path d="M2 1.5 19.5 12l-7.6 1.6-4.2 7.7L2 1.5Z" fill={INK} stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round"></path></svg>
<span style={{marginTop:"17px",padding:"3px 9px",borderRadius:"7px",background:"#ffffff",boxShadow:"0 1px 3px rgba(28,31,35,0.14)",font:f(400,12,16)}}>Rahul</span>
</span>
</div>

<div data-flow-row style={{position:"relative",display:"flex",alignItems:"center",gap:"10px",minHeight:"44px",paddingLeft:"54px"}}>
<FlowTick />
<span style={{font:f(400,15,20)}}>and</span>
<span data-flow-chip style={{...flowChip,color:MUTED}}>Earlier refunds</span>
<span style={{font:f(400,15,20)}}>are</span>
<span data-flow-chip style={flowChip}>None</span>
<FlowResult>{priorRefunds}</FlowResult>
</div>

<div data-flow-row style={{position:"relative",display:"flex",alignItems:"center",gap:"10px",minHeight:"44px"}}>
<FlowIcon d={ICON.check} />
<span style={{font:f(400,15,20)}}>Then</span>
<span data-flow-chip style={{...flowChip,gap:"10px",padding:"0 15px 0 6px"}}><span style={{display:"grid",placeItems:"center",width:"30px",height:"30px",borderRadius:"6px",background:"#dcebe1",color:"#1a6b43"}}><Glyph d="M3 5h18v14H3V5Zm11 7a2 2.5 0 1 1-4 0 2 2.5 0 1 1 4 0" size={15} stroke={1.8} /></span>Issue refund {refund}</span>
<span style={{font:f(400,16,20),color:MUTED}}>+</span>
<span data-flow-chip style={{...flowChip,gap:"10px",padding:"0 15px 0 6px"}}><span style={{display:"grid",placeItems:"center",width:"30px",height:"30px",borderRadius:"6px",background:"#ffe4d3",color:INK}}><Glyph d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" size={15} stroke={1.8} /></span>Assess carrier claim up to {recoveryCeiling}</span>
</div>

<div data-flow-row style={{position:"relative",display:"flex",alignItems:"center",gap:"10px",minHeight:"44px"}}>
<FlowIcon d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M5 21v-2a7 7 0 0 1 14 0v2" />
<span style={{font:f(400,15,20)}}>Otherwise</span>
<span data-flow-chip style={{...flowChip,gap:"10px",padding:"0 15px 0 6px"}}><span style={{display:"grid",placeItems:"center",width:"30px",height:"30px",borderRadius:"6px",background:"#e6e2f0",font:f(500,11,1),color:"#4c4470"}}>{launch.recovery.ownerInitials}</span>{launch.recovery.owner}</span>
<span style={{font:f(400,15,20)}}>reviews it</span>
</div>
</div>

{/* Published gates are evaluated together; a single broad match cannot override missing requirements. */}
<div style={{overflow:"hidden",borderRadius:"12px",background:"#ffffff",boxShadow:"0 2px 4px rgba(28,31,35,0.03),0 16px 40px -12px rgba(28,31,35,0.16)"}}>
<div style={{...docHead,padding:"14px 20px"}}>
<GateMark />
<span>Gates · evaluated together</span><span style={{marginLeft:"auto"}}>{launch.gates.length} published</span>
</div>
{launch.gates.map((gate, index) => {
  const matched = index === 4;
  return <div key={gate.condition} data-gate-row style={{display:"flex",alignItems:"center",gap:"12px",minHeight:matched ? "54px" : "46px",padding:"6px 20px",boxSizing:"border-box",borderBottom:`1px solid ${HAIR}`,background:matched ? "#fff6f0" : undefined}}>
    <span style={{flex:"none",width:"14px",font:f(matched ? 500 : 400,12,16),color:matched ? INK : MUTED}}>{index + 1}</span>
    <span data-gate-condition style={{flex:"1",minWidth:"0",display:"flex",flexDirection:"column",gap:"2px",font:f(matched ? 500 : 400,13.5,18)}}>{gate.condition}{matched && <span style={{display:"flex",alignItems:"center",gap:"6px",font:f(400,11.5,16),color:MUTED}}><Dot />Matched {launch.reference}</span>}</span>
    <span data-gate-route style={{flex:"none"}}><Pill tone={gate.tone}>{gate.route}</Pill></span>
  </div>;
})}
<div style={{display:"flex",alignItems:"center",gap:"10px",padding:"13px 20px",background:TINT}}>
<span style={{display:"grid",placeItems:"center",width:"24px",height:"24px",borderRadius:"6px",background:INK,color:"#ffffff"}}><Glyph d="M12 3v3M6 7h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM9 12h.01M15 12h.01" size={13} stroke={1.9} /></span>
<span style={{font:f(400,12.5,18),color:"#40454a"}}>Your AI support agent passes the same gates.</span>
</div>
</div>

</div>
</div>
</div>
</section>

{/* ============ OUTCOMES (last build: costly mistakes, three cases) ============ */}
<section id="examples" style={{marginTop:"128px"}}>
<div data-lr="container" style={container}>
<SplitHeading title="Costly mistakes." rest="Clear system decisions.">Unauth applies your policy to the evidence and selects the outcome. Your team handles the exceptions.</SplitHeading>
<div data-lr="cases" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"16px",alignItems:"stretch",marginTop:"44px"}}>
<CaseCard spotlight label="Not received" reference={launch.reference} title="No parcel. A refund and a loss to recover." visual={<Thumb src="/demo/items/wool-coat.jpg" alt="" />} visualLabel={launch.item} checks={['3PL handover confirmed', 'Carrier loss confirmed', 'No earlier refund', `${refund} refund not above review limit`]} decision={`Refund ${refund}`} />
<CaseCard label="Wrong item" reference="SAMPLE-248" title="Refund due. Warehouse recovery capped." visual={<Thumb src="/demo/evidence/wrong-item-packing.jpg" alt="Packing photo: a grey shirt in the parcel instead of the ordered wool coat" />} visualLabel="Packing photo" checks={['Packing error acknowledged', 'No earlier refund', `${gbp(15000)} recovery ceiling`]} decision={`Refund ${gbp(24800)}`} />
<CaseCard label="Damaged item" reference="SAMPLE-096" title="Customer left with a broken item." visual={<Thumb src="/demo/evidence/damaged-bowl.jpg" alt="Customer photo: a chipped rim on the ceramic serving bowl" />} visualLabel="Damage photo" checks={['Damage photo matches', 'No prior concession', 'Stock available']} decision="Send replacement" />
</div>
</div>
</section>

{/* ============ RECOVERY + MONEY (Ramp statement + two-up, last build's cards) ============ */}
<section id="recovery" style={{marginTop:"128px"}}>
<div data-lr="container" style={container}>
<Statement title="Resolve the customer." rest="Recover eligible money." width={660}>The customer’s {refund} refund is confirmed. Unauth builds the eligible carrier claim from the same evidence, owns each follow-up and records whether it is rejected, short-paid, received or reconciled.</Statement>
<div data-lr="pair" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"24px",alignItems:"stretch",marginTop:"48px"}}>

<div data-card="half" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="Customer refunded" title="Customer refunded." rest="Recovery owned." />
<div style={{flex:"1",display:"flex",flexDirection:"column",padding:"34px 32px 30px"}}>
<div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:"4px 10px",paddingBottom:"16px",borderBottom:`1px solid ${RULE}`}}>
<Check />
<span style={{font:f(500,13,19)}}>Refund {refund} issued automatically</span>
<span style={{font:f(400,12,18),color:MUTED}}>{launch.customerResolution.provider} confirmed</span>
</div>
<div style={{marginTop:"24px"}}>
<span style={{display:"inline-flex",alignItems:"center",gap:"8px",maxWidth:"100%",minHeight:"34px",padding:"0 14px",boxSizing:"border-box",borderRadius:"9px 9px 0 0",background:"#ff7a30",font:f(500,13,16)}}><Glyph d={ICON.document} size={15} stroke={1.6} />{launch.reference} · Earlier recovery snapshot</span>
<div style={{overflow:"hidden",borderRadius:"0 10px 10px 10px",background:"#ffffff",boxShadow:"0 2px 4px rgba(28,31,35,0.03),0 16px 40px -12px rgba(28,31,35,0.16)"}}>
<div style={{padding:"20px 22px 18px",borderBottom:`1px solid ${RULE}`}}>
<span style={{display:"block",font:f(400,12,18),color:MUTED}}>As at {launch.recovery.blockedAt} · blocked: claimant and channel unconfirmed</span>
<div style={{marginTop:"6px",font:f(400,30,36),letterSpacing:"-0.03em"}}>Up to {recoveryCeiling} eligible</div>
<span style={{display:"block",marginTop:"4px",font:f(400,12,18),color:MUTED}}>{launch.recoveryAgreement.name} · agreement limit</span>
</div>
<div style={{padding:"14px 22px 6px"}}>
<span style={{display:"block",marginBottom:"4px",font:f(500,12,18)}}>Supporting evidence</span>
<EvidenceLine title="Order record" source="Shopify" />
<EvidenceLine title="Handover scan" source="ShipBob" />
<EvidenceLine title="Collection scan" source="Carrier" />
<EvidenceLine last title="Loss confirmation" source="Carrier" />
</div>
<div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:"6px 10px",padding:"12px 22px 13px",borderTop:`1px solid ${RULE}`,background:TINT}}>
<Avatar initials={launch.recovery.ownerInitials} size={28} />
<div style={{flex:"1",minWidth:"180px"}}><div style={{font:f(500,13,18)}}>{launch.recovery.owner}</div><div style={{font:f(400,12,16),color:MUTED}}>Next: {launch.recovery.blocker.toLowerCase()}</div></div>
<span style={{font:f(400,12,16),color:MUTED}}>If unresolved: {launch.recovery.reviewIfUnresolved.replace(' 2026','')}</span>
</div>
</div>
</div>
<ol aria-label="Recovery stages" style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:"6px 8px",margin:"0",marginTop:"auto",padding:"22px 0 0",listStyle:"none",font:f(400,12,18),color:MUTED}}>
{(['Evidence', 'Claim', 'Follow-up', 'Payment'] as const).map((stage, index) => <li key={stage} style={{display:"flex",alignItems:"center",gap:"8px"}}>
  {index > 0 && <Glyph d={ICON.chevronRight} size={12} stroke={1.8} style={{color:"#a9a6a0"}} />}
  <span style={{display:"inline-flex",alignItems:"center",gap:"6px",color:index === 0 ? INK : MUTED}}><span aria-hidden="true" style={{width:"6px",height:"6px",borderRadius:"50%",background:index === 0 ? INK : "transparent",boxShadow:index === 0 ? undefined : "inset 0 0 0 1px #a9a6a0"}}></span>{stage}</span>
</li>)}
</ol>
</div>
</div>

<div data-card="half" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="Later financial result" title="Later financial result." rest={`${recovered} received and reconciled.`} />
<div style={{flex:"1",display:"flex",flexDirection:"column",justifyContent:"center",padding:"34px 32px 30px"}}>
<div style={{overflow:"hidden",borderRadius:"12px",background:"#ffffff",boxShadow:"0 2px 4px rgba(28,31,35,0.03),0 16px 40px -12px rgba(28,31,35,0.16)"}}>
<div style={docHead}>
<GateMark />
<span>Payment records / {launch.reference}</span><span style={{marginLeft:"auto",padding:"1px 8px",borderRadius:"5px",background:"#eef6f1",font:f(500,11.5,18),color:"#1a6b43",whiteSpace:"nowrap"}}>As at {eventDay(launch.recovery.reconciledAt)} · reconciled</span>
</div>
<div style={{padding:"22px 22px 6px"}}>
<div className={styles.recoveryTimelineDesktop}>
<div data-lr="table" style={{display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",font:f(400,11,16),color:MUTED}}><span style={{gridColumn:"1 / span 3"}}>The claim</span><span style={{gridColumn:"4 / span 3"}}>The money</span></div>
<div data-lr="table" style={{position:"relative",display:"grid",gridTemplateColumns:"repeat(6,minmax(0,1fr))",marginTop:"14px"}}>
<div style={{position:"absolute",left:"7px",width:"33.333%",top:"6px",height:"2px",background:INK}}></div>
<div style={{position:"absolute",left:"calc(33.333% + 7px)",width:"16.667%",top:"6px",height:"0",borderTop:"2px dashed #c9c6c0"}}></div>
<span style={{position:"absolute",left:"calc(41.667% + 7px)",top:"-3px",transform:"translateX(-50%)",height:"18px",padding:"0 6px",borderRadius:"4px",background:"#fff1e8",font:f(500,10,18),whiteSpace:"nowrap"}}>Approval ≠ payment</span>
<div style={{position:"absolute",left:"calc(50% + 7px)",width:"33.333%",top:"6px",height:"2px",background:"#2f8f5b"}}></div>
{recoveryStages.map((stage) => <div key={stage.label}><span style={{display:"block",width:"14px",height:"14px",borderRadius:"50%",background:stage.state === 'money' ? "#2f8f5b" : stage.state === 'approved' ? "#ffffff" : INK,boxShadow:stage.state === 'approved' ? `inset 0 0 0 2px ${INK},0 0 0 3px #ffffff` : "0 0 0 3px #ffffff"}}></span><div style={{marginTop:"10px",font:f(500,12,16)}}>{stage.label}</div><div style={{font:f(400,11,16),color:MUTED}}>{eventDay(stage.at)}</div></div>)}
</div>
</div>
<div className={styles.recoveryTimelineMobile}>
{recoveryStages.map((stage) => <div key={stage.label} className={styles.recoveryTimelineStage} data-state={stage.state}><span aria-hidden="true"></span><strong>{stage.label}</strong><small>{eventDay(stage.at)}</small></div>)}
</div>
</div>
<div style={{margin:"18px 22px 0",borderTop:`1px solid ${RULE}`}}></div>
<div style={{padding:"4px 22px 4px"}}>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",minHeight:"42px",borderBottom:`1px solid ${HAIR}`,font:f(400,13.5,19)}}><span>Refund issued to the customer</span><span>{refund}</span></div>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",minHeight:"42px",borderBottom:`1px solid ${HAIR}`,font:f(400,13.5,19)}}><span style={{display:"flex",alignItems:"center",gap:"9px"}}><Check />Received, matched and reconciled</span><span style={{color:"#1a6b43",whiteSpace:"nowrap"}}>− {recovered}</span></div>
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",minHeight:"52px"}}><span style={{font:f(500,13.5,19)}}>Unrecovered refund balance</span><span style={{font:f(400,24,30),letterSpacing:"-0.02em"}}>{unrecoveredRefundBalance}</span></div>
</div>
<div style={{margin:"2px 22px 20px",padding:"11px 13px",borderRadius:"8px",background:"#f7f6f3",font:f(400,12.5,19),color:"#40454a"}}>Later view: route confirmed and claim submitted on {eventDay(launch.recovery.submittedAt)}; approval recorded on {eventDay(launch.recovery.approvedAt)}; payment received on {eventDay(launch.recovery.receivedAt)}, then matched and reconciled on {eventDay(launch.recovery.reconciledAt)}.</div>
</div>
</div>
</div>

</div>
</div>
</section>

{/* ============ OPERATIONS (Ramp 2+3 platform grid, last build's cards) ============ */}
<section id="work" style={{marginTop:"128px"}}>
<div data-lr="container" style={container}>
<SplitHeading title="Nothing falls between teams." rest="Every claim keeps an owner.">Support, recovery and finance work from the same case, alongside the store, helpdesk and 3PL you already run.</SplitHeading>

<div data-lr="pair" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:"24px",alignItems:"stretch",marginTop:"44px"}}>

<div data-card="half" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="The next step" title="The next step." rest="With a name beside it." />
<div style={{flex:"1",padding:"34px 32px 32px"}}>
<div style={{overflow:"hidden",borderRadius:"12px",background:"#ffffff",boxShadow:SHADOW_DOC}}>
<div style={docHead}>
<GateMark />
<span>Work / Open tasks</span><span style={{marginLeft:"auto",letterSpacing:"0.1em"}} aria-hidden="true">···</span>
</div>
<div style={{display:"flex",flexWrap:"wrap",gap:"4px",padding:"8px 14px",borderBottom:`1px solid ${RULE}`}}>
<span style={{padding:"5px 10px",borderRadius:"6px",background:PAPER,font:f(500,12.5,16)}}>All 5</span><span style={{padding:"5px 10px",font:f(400,12.5,16),color:MUTED}}>Support 2</span><span style={{padding:"5px 10px",font:f(400,12.5,16),color:MUTED}}>Recovery 2</span><span style={{padding:"5px 10px",font:f(400,12.5,16),color:MUTED}}>Finance 1</span>
</div>
<WorkRow context={`${launch.reference} · Not received`} task={launch.recovery.blocker} initials={launch.recovery.ownerInitials} tone="violet" owner="Amelia" status={<Pill tone="review">Blocked</Pill>} />
<WorkRow context="SAMPLE-248 · Wrong item" task={`Submit the 3PL claim for ${gbp(15000)}`} initials="AR" tone="violet" owner="Amelia" status={<span style={{font:f(400,12,16),color:MUTED}}>26 Sep</span>} />
<WorkRow context="SAMPLE-096 · Damaged item" task="Confirm replacement dispatch" initials="TM" tone="green" owner="Theo" status={<Pill tone="accent">Today</Pill>} />
<WorkRow context="SAMPLE-128 · Repeat request" task="Review the duplicate-payout exception" initials="TM" tone="green" owner="Theo" status={<Pill tone="accent">Today</Pill>} />
<WorkRow last context={`${launch.reference} · Not received`} task={`Review ${unrecoveredRefundBalance} unrecovered refund balance`} initials="RM" tone="blue" owner="Rahul" status={<span style={{font:f(400,12,16),color:MUTED}}>30 Sep</span>} />
</div>
</div>
</div>

<div data-card="half" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="A better next decision" title="A better next decision." rest="Preview before you publish." />
<div style={{flex:"1",padding:"34px 32px 32px"}}>
<div style={{overflow:"hidden",borderRadius:"12px",background:"#ffffff",boxShadow:SHADOW_DOC}}>
<div style={docHead}>
<GateMark />
<span>Rules / Refunds above {reviewThreshold}</span><span style={{marginLeft:"auto"}}><Pill tone="review" style={{font:f(500,11.5,18)}}>Draft</Pill></span>
</div>
<div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:"9px",padding:"15px 22px",borderBottom:`1px solid ${RULE}`,font:f(400,13.5,18)}}>
<span>Review refunds above</span><span style={{color:MUTED,textDecoration:"line-through"}}>{reviewThreshold}</span><span style={{display:"flex",color:MUTED}}><Glyph d={ICON.forward} size={14} /></span><Pill tone="accent" style={{font:f(500,13.5,18),padding:"3px 8px"}}>{gbp(20000)}</Pill></div>
<div data-lr="table" data-cols="stats" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",borderBottom:`1px solid ${RULE}`}}>
<div style={{padding:"13px 22px"}}><div style={{font:f(400,11.5,16),color:MUTED}}>Cases checked</div><div style={{marginTop:"3px",font:f(400,20,26)}}>4</div></div>
<div style={{padding:"13px 22px",borderLeft:`1px solid ${RULE}`}}><div style={{font:f(400,11.5,16),color:MUTED}}>Would change</div><div style={{marginTop:"3px",font:f(400,20,26)}}>2</div></div>
<div style={{padding:"13px 22px",borderLeft:`1px solid ${RULE}`}}><div style={{font:f(400,11.5,16),color:MUTED}}>Sent to review</div><div style={{marginTop:"3px",font:f(400,20,26)}}>{gbp(49600)}</div></div>
</div>
<PreviewRow reference={launch.reference} amount={refund} escalates />
<PreviewRow reference="SAMPLE-248" amount={gbp(24800)} escalates />
<PreviewRow reference="SAMPLE-128" amount={gbp(12800)} escalates={false} />
<PreviewRow last reference="SAMPLE-096" amount={gbp(9600)} escalates={false} />
<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"12px",padding:"11px 22px",background:TINT}}><span style={{font:f(400,12,18),color:MUTED}}>Nothing changes until you publish.</span><span style={{display:"inline-flex",alignItems:"center",minHeight:"30px",padding:"0 12px",borderRadius:"6px",background:INK,color:"#ffffff",font:f(500,12,18)}}>Publish</span></div>
</div>
</div>
</div>

</div>

<div data-lr="trio" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"24px",alignItems:"stretch",marginTop:"24px"}}>

<div data-card="third" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="Familiar tools" title="Familiar tools." rest="One connected case." />
<div style={{flex:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"22px",padding:"30px 24px 30px"}}>
<div style={{display:"grid",gridTemplateColumns:"repeat(5,56px)",gap:"12px",justifyContent:"center",alignItems:"center",WebkitMaskImage:"radial-gradient(ellipse 62% 70% at 50% 50%, #000 55%, rgba(0,0,0,0.35) 85%, transparent 100%)",maskImage:"radial-gradient(ellipse 62% 70% at 50% 50%, #000 55%, rgba(0,0,0,0.35) 85%, transparent 100%)"}}>
{([
  null,
  ['/providers/woo-wordmark.svg', 'WooCommerce', 38, 16],
  ['/providers/ups.svg', 'UPS', 26, 26],
  ['/providers/freshdesk.png', 'Freshdesk', 26, 26],
  null,
  ['/providers/zendesk.svg', 'Zendesk', 26, 26],
  ['/providers/shopify.svg', 'Shopify', 26, 26],
  'unauth',
  ['/providers/gorgias.png', 'Gorgias', 26, 26],
  ['/providers/shipbob.svg', 'ShipBob', 26, 26],
  null,
  ['/providers/bigcommerce.svg', 'BigCommerce', 24, 24],
  ['/providers/fedex-wordmark.png', 'FedEx', 40, 12],
  ['/providers/document-upload.svg', 'Documents and imports', 26, 26],
  null,
] as const).map((tile, index) => {
  if (tile === null) return <span key={index} style={{width:"56px",height:"56px",borderRadius:"12px",background:"rgba(255,255,255,0.55)"}}></span>;
  if (tile === 'unauth') return <span key={index} style={{display:"grid",placeItems:"center",width:"56px",height:"56px",borderRadius:"13px",background:"#ff7a30",color:INK,boxShadow:"0 8px 18px -8px rgba(255,122,48,0.7)"}}><GateMark size={26} color="currentColor" /></span>;
  const [src, alt, width, height] = tile;
  return <span key={index} style={{display:"grid",placeItems:"center",width:"56px",height:"56px",borderRadius:"12px",background:"#ffffff",boxShadow:"0 1px 2px rgba(28,31,35,0.06),0 6px 14px -8px rgba(28,31,35,0.2)"}}><img src={src} alt={alt} width={width} height={height} style={{display:"block",width:`${width}px`,height:width === height ? `${height}px` : "auto",borderRadius:alt === 'Gorgias' ? "5px" : undefined,objectFit:"contain"}} /></span>;
})}
</div>
<p style={{margin:"0",font:f(400,12,18),color:MUTED,textAlign:"center"}}>Stores · Helpdesks · Warehouses · Carriers · Documents</p>
</div>
</div>

<div data-card="third" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="Already refunded" title="Already refunded?" rest="There may still be a route." />
<div style={{flex:"1",display:"flex",flexDirection:"column",justifyContent:"center",padding:"30px 30px 30px"}}>
<div style={{padding:"24px 24px 14px",borderRadius:"12px",background:"#ffffff",boxShadow:SHADOW_DOC}}>
<span style={{display:"grid",placeItems:"center",width:"40px",height:"40px",borderRadius:"9px",background:PAPER}}><Glyph d={ICON.document} size={19} stroke={1.5} /></span>
<div style={{margin:"18px 0 14px",font:f(400,19,24),letterSpacing:"-0.02em"}}>Check older refunds for a valid recovery route.</div>
<ul style={{margin:"0",padding:"0",listStyle:"none"}}>
{([
  [ICON.refunded, 'Confirm the refund and case evidence'],
  [ICON.terms, 'Check the terms, claimant and deadline'],
  [ICON.search, 'Find any existing claim or receipt'],
] as const).map(([glyph, label]) => <li key={label} style={{display:"flex",alignItems:"center",gap:"11px",padding:"9px 0",borderTop:`1px solid ${RULE}`,font:f(400,12.5,18)}}><span style={{flex:"none",display:"grid",placeItems:"center",width:"26px",height:"26px",borderRadius:"7px",background:PAPER}}><Glyph d={glyph} size={14} stroke={1.6} /></span>{label}</li>)}
</ul>
</div>
</div>
</div>

<div data-card="third" style={{...paperCard,display:"flex",flexDirection:"column"}}>
<CardHead id="Every decision" title="Every decision." rest="With its reasons." />
<div style={{flex:"1",display:"flex",flexDirection:"column",justifyContent:"center",padding:"30px 30px 30px"}}>
<div style={{overflow:"hidden",borderRadius:"12px",background:"#ffffff",boxShadow:SHADOW_DOC}}>
<div style={{...docHead,minHeight:"44px",padding:"12px 18px"}}>
<GateMark /><span>{launch.reference} / History</span>
</div>
<div style={{display:"flex",flexDirection:"column",padding:"16px 18px 18px"}}>
<HistoryRow first at={launch.customerResolution.decidedAt} kind="decision">Policy matched: all required conditions</HistoryRow>
<HistoryRow at={launch.customerResolution.decidedAt} kind="decision">Refund {refund} issued · {launch.customerResolution.provider} confirmed</HistoryRow>
<HistoryRow at={launch.recovery.blockedAt} kind="blocked">Claim blocked: claimant and channel · assigned to {launch.recovery.owner}</HistoryRow>
<HistoryRow at={launch.recovery.submittedAt} kind="decision">Route confirmed · claim submitted</HistoryRow>
<HistoryRow at={launch.recovery.approvedAt} kind="approved">{recovered} approved · payment still outstanding</HistoryRow>
<HistoryRow at={launch.recovery.receivedAt} kind="money">{recovered} received</HistoryRow>
<HistoryRow last at={launch.recovery.reconciledAt} kind="money">Payment matched and reconciled · {unrecoveredRefundBalance} refund balance remains</HistoryRow>
</div>
</div>
</div>
</div>

</div>
</div>
</section>

{/* ============ FAQ (Ramp rows) ============ */}
<section id="faq" style={{marginTop:"128px"}}>
<div data-lr="container" style={container}>
<h2 style={{margin:"0 0 40px",font:f(400,48,50),letterSpacing:"-0.035em"}}>FAQs</h2>
{([
  ['What happens automatically, and what do we approve?', 'You publish the policy and choose, for each action, observe-only, approval or automatic. Fully evidenced cases inside your limits run automatically and Unauth records the provider’s result. Missing evidence, limits and exceptions are assigned to a named owner.'],
  ['Will this work with our current tools?', 'Your store and helpdesk stay in place. We confirm the store, helpdesk, 3PL and carrier records your setup can supply, and which steps remain manual.'],
  ['Can we recover the whole refund?', 'Not always. The agreement, evidence and right to submit determine what can be claimed. Approval is not payment, and customer resolution does not wait for recovery.'],
  ['How do we start?', 'Connect your operational sources, then upload or enter your customer policies and partner agreements. Unauth extracts candidate rules with their source clauses; you review their scope and effects, publish the approved versions and choose the action mode and owners.'],
] as const).map(([question, answer], index, all) => <details key={question} style={{borderTop:`1px solid ${RULE}`,borderBottom:index === all.length - 1 ? `1px solid ${RULE}` : undefined}}>
<summary style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"24px",minHeight:"70px",cursor:"pointer"}}><span style={{font:f(400,16,24)}}>{question}</span><span style={{flex:"none",display:"grid",placeItems:"center",width:"32px",height:"32px",border:`1px solid ${RULE}`,borderRadius:"6px",background:"#ffffff",transition:"border-color .2s ease-out"}} aria-hidden="true"><Glyph d={ICON.chevronDown} size={14} stroke={1.8} /></span></summary>
<p style={{margin:"0 0 22px",maxWidth:"720px",font:f(400,15,24),color:MUTED}}>{answer}</p>
</details>)}
</div>
</section>

{/* ============ CLOSE (Ramp minimal) ============ */}
<section id="start" style={{marginTop:"128px",paddingBottom:"128px"}}>
<div data-lr="container" style={{...container,display:"flex",flexDirection:"column",alignItems:"center",gap:"24px",textAlign:"center"}}>
<h2 style={{margin:"0",font:f(400,28,32),letterSpacing:"-0.025em"}}>Your rules before money moves.</h2>
<div style={{display:"flex",alignItems:"center",flexWrap:"wrap",justifyContent:"center",gap:"12px"}}>
<a href={demo} data-btn="primary" style={{...buttonBase,background:"#ff7a30"}}>See it in action<Glyph d={ICON.forward} icon="forward" /></a>
<Link href="/pricing" data-btn="secondary" style={{...buttonBase,background:PAPER}}>Explore pricing</Link>
</div>
</div>
</section>


  </div>;
}
