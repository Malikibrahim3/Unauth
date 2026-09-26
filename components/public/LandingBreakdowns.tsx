// Breakdowns behind the landing's corner arrows. Each one keeps the card's existing
// text and adds artefacts that take the subject apart: one lead scene, then smaller
// scenes for each fact. Facts come only from lib/demo/merchantCaseV1; no live data.

import type { CSSProperties, ReactNode } from 'react';
import { DEMO_LANDING_POLICY_OUTCOMES, DEMO_LAUNCH_STORY, DEMO_PRESENTATION, DEMO_SOURCE_PRESENTATION } from '@/lib/demo/merchantCaseV1';
import { formatMoney } from '@/lib/utils/format';
import s from './landingBreakdown.module.css';

export type BreakdownDetail = { subtitle: string; lead: string; facts: [string, ReactNode][] };

const launch = DEMO_LAUNCH_STORY;
const gbp = (minor: number) => formatMoney(minor, launch.currency);
const refund = gbp(launch.customerResolution.amount);
const ceiling = gbp(launch.recoveryAgreement.ceiling);
const threshold = gbp(launch.customerPolicy.proposedRefundReview.amount);
const recovered = gbp(launch.money.recovered);
const balance = gbp(launch.money.unrecoveredRefundBalance);
const day = (timestamp: string) => timestamp.split(' · ')[0];

const I = {
  forward: 'M5 12h14M13 6l6 6-6 6',
  cash: 'M3 5h18v14H3V5Zm11 7a2 2.5 0 1 1-4 0 2 2.5 0 1 1 4 0',
  recover: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  box: 'm3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10M7 5l10 4',
  warehouse: 'M3 21V9l9-5 9 5v12M7 21v-6h10v6M7 17h10',
  store: 'M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2',
  document: 'M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8M8 16h5',
  bot: 'M12 3v3M6 7h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2ZM9 12h.01M15 12h.01',
  link: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4',
  check: 'm5 12 4 4L19 6',
  missing: 'M14 3H5v18h14V8l-5-5Zm0 0v5h5M10 12.2a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.3M12 17.5h.01',
  message: 'M4 4h16v12H8l-4 4V4Z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 6h6M9 13h6',
  upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4',
  extract: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M9 13h6M9 17h4',
  review: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  refunded: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M9 14l2 2 4-4',
  terms: 'M8 3v3M16 3v3M4.5 9h15M5.5 5h13a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8.5 13h2M8.5 16.5h5',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
} as const;

function Icon({ d, size = 14, stroke = 1.7, style }: { d: string; size?: number; stroke?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', ...style }}><path d={d} /></svg>;
}

function Check({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: 'none' }}><circle cx="8" cy="8" r="8" fill="#e5f2ea" /><path d="m4.8 8.2 2.1 2.1 4.3-4.5" stroke="#1a6b43" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Mark({ size = 12, color = '#1c1f23' }: { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ flex: 'none' }}><g stroke={color} strokeWidth="8"><path d="M16 8V18" /><path d="M16 26v10a16 16 0 0 0 32 0V8" /></g></svg>;
}

type Source = 'Shopify' | 'ShipBob' | 'Gorgias' | 'Carrier' | 'Unauth' | '3PL' | 'Store' | 'Agreement' | 'Photo';
const sourceImages: Partial<Record<Source, string>> = { Shopify: '/providers/shopify.svg', ShipBob: '/providers/shipbob.svg', Gorgias: '/providers/gorgias.png' };
const sourceGlyphs: Partial<Record<Source, string>> = { Carrier: I.box, '3PL': I.warehouse, Store: I.store, Agreement: I.document, Photo: 'M4 5h16v14H4V5Zm0 11 5-5 4 4 3-3 4 4M15 9h.01' };

/** A source's mark. Names stay in the adjacent text; the mark only helps scanning. */
function SourceMark({ name }: { name: Source }) {
  const image = sourceImages[name];
  return <span className={s.markBox} aria-hidden="true">{image ? <img src={image} alt="" /> : name === 'Unauth' ? <Mark size={11} /> : <Icon d={sourceGlyphs[name] ?? I.document} size={13} stroke={1.6} />}</span>;
}

function Pill({ tone, children }: { tone?: 'positive' | 'review' | 'critical' | 'accent' | 'quiet'; children: ReactNode }) {
  return <span className={s.pill} data-tone={tone}>{children}</span>;
}

function Avatar({ initials, tone, large = false }: { initials: string; tone?: 'green' | 'blue'; large?: boolean }) {
  return <span className={s.avatar} data-tone={tone} data-size={large ? 'lg' : undefined} aria-hidden="true">{initials}</span>;
}

function Doc({ head, end, foot, children, style }: { head: ReactNode; end?: ReactNode; foot?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return <div className={s.doc} style={style}>
    <div className={s.docHead}>{head}{end && <span data-end>{end}</span>}</div>
    {children}
    {foot && <div className={s.docFoot}>{foot}</div>}
  </div>;
}

function Shell({ lead, children }: { lead: string; children: ReactNode }) {
  return <div className={s.breakdown}><p className={s.lead}>{lead}</p>{children}</div>;
}

function Stage({ label, dots = false, children }: { label: string; dots?: boolean; children: ReactNode }) {
  return <figure className={s.stage} data-dots={dots || undefined} aria-label={label}>{children}</figure>;
}

function Tiles({ cols, children }: { cols: number; children: ReactNode }) {
  return <div className={s.tiles} style={{ '--cols': cols } as CSSProperties}>{children}</div>;
}

function Tile({ title, media, children }: { title: string; media: ReactNode; children?: ReactNode }) {
  return <article className={s.tile}><div className={s.tileMedia}>{media}</div><h3>{title}</h3>{children && <p>{children}</p>}</article>;
}

function Arrow() {
  return <span className={s.arrow}><Icon d={I.forward} size={16} /></span>;
}

function Outcome({ tone, label, value, state }: { tone: 'refund' | 'recovery' | 'replace'; label: string; value: string; state?: ReactNode }) {
  return <div className={s.outcomeRow}>
    <span className={s.outcomeIcon} data-tone={tone === 'recovery' ? 'recovery' : undefined}><Icon d={tone === 'recovery' ? I.recover : tone === 'replace' ? I.box : I.cash} size={14} stroke={1.8} /></span>
    <div><span className={s.label}>{label}</span><span className={s.strong}>{value}</span></div>
    {state}
  </div>;
}

/** Splits a canonical fixture rule ("a + b → c") into its conditions and route. */
function ruleParts(rule: string) {
  const money = (text: string) => text.replace(/£(\d+)(?![.\d])/g, (_, pounds: string) => gbp(Number(pounds) * 100));
  const [conditions, route] = rule.split(' → ');
  const sentence = (text: string) => money(text.charAt(0).toUpperCase() + text.slice(1));
  return { conditions: conditions.split(' + ').map((condition, index) => index === 0 ? sentence(condition) : money(condition)), route: sentence(route) };
}

function DecisionFlow({ reference, evidence, rule, outcomes }: { reference: string; evidence: readonly [Source, string][]; rule: string; outcomes: ReactNode }) {
  const { conditions, route } = ruleParts(rule);
  return <div className={s.flow}>
    <div className={s.flowCol}>
      <span className={s.flowTitle}>Evidence</span>
      <Doc head={<><Mark />{reference}</>}><div className={s.docBody}>{evidence.map(([source, text]) => <div key={text} className={s.line}><SourceMark name={source} />{text}<span data-end><Check /></span></div>)}</div></Doc>
    </div>
    <Arrow />
    <div className={s.flowCol}>
      <span className={s.flowTitle}>Your policy</span>
      <Doc head={<><Mark />{launch.customerPolicy.name}</>} end={<Pill tone="positive">{launch.customerPolicy.state}</Pill>}>
        <div className={s.ruleText}>{conditions.map((condition, index) => <span key={condition} style={{ display: 'block' }}>{index > 0 && <span className={s.muted}>and </span>}{condition}</span>)}<strong>Route: {route}</strong></div>
      </Doc>
    </div>
    <Arrow />
    <div className={s.flowCol}>
      <span className={s.flowTitle}>Unauth decides</span>
      <div className={s.doc}>{outcomes}</div>
    </div>
  </div>;
}

function Compare({ left, right, verdict }: { left: { src: string; alt: string; caption: string }; right: { src: string; alt: string; caption: string }; verdict: string }) {
  return <div>
    <div className={s.compare}>
      {[left, right].map((side) => <figure key={side.src}><img src={side.src} alt={side.alt} width="128" height="128" /><figcaption>{side.caption}</figcaption></figure>)}
    </div>
    <div className={s.verdictLine}><Check />{verdict}</div>
  </div>;
}

/* ============ The claim · The records · The decision ============ */
function OrderSheet() {
  return <Doc head={<><SourceMark name="Shopify" />Order record · {launch.reference}</>}>
    <div className={s.docBody}>
      <div className={s.line} style={{ paddingBottom: 8 }}><img className={s.thumb} src={DEMO_PRESENTATION['not-received'].image} alt="" width="40" height="40" /><div><span className={s.strong} style={{ display: 'block' }}>{launch.item}</span><span className={s.label}>{launch.sku} · Qty 1</span></div><span data-end className={s.strong}>{refund}</span></div>
      <div className={s.line}><span className={s.muted}>Refund requested</span><span data-end>{refund}</span></div>
      <div className={s.line}><span className={s.muted}>Previous refunds</span><span data-end>{gbp(launch.evidence.priorRefund)}</span></div>
      <div className={s.line}><span className={s.muted}>Paid</span><span data-end>{launch.evidence.paidAt}</span></div>
    </div>
  </Doc>;
}

function TheClaim({ detail }: { detail: BreakdownDetail }) {
  const [request, reported] = detail.facts;
  return <Shell lead={detail.lead}>
    <Stage dots label={`Two sources assemble claim ${launch.reference}`}>
      <div className={s.feed}>
        <div className={s.feedSources}>
          <span className={s.feedSource}><SourceMark name="Gorgias" /><div><span className={s.label}>Gorgias</span>Customer report</div></span>
          <span className={s.feedSource}><SourceMark name="Shopify" /><div><span className={s.label}>Shopify</span>Order record</div></span>
        </div>
        <svg className={s.feedLines} width="560" height="42" viewBox="0 0 560 40" preserveAspectRatio="none" aria-hidden="true">
          {[142, 418].map((from) => <path key={from} d={`M${from} 0 C ${from} 24, 280 16, 280 40`} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className={s.claimCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><span className={s.label}>{launch.reference} · Customer claim</span><span className={s.pill} data-tone="accent"><span className={s.dot} />Refund requested</span></div>
          <h4>Item not received</h4>
          <span className={s.muted} style={{ fontSize: 13 }}>{launch.item} · {refund} refund request</span>
        </div>
      </div>
    </Stage>
    <Tiles cols={2}>
      <Tile title={request[0]} media={<OrderSheet />}>{request[1]}</Tile>
      <Tile title={reported[0]} media={<Doc head={<><SourceMark name="Gorgias" />Customer report · {launch.reference}</>}>
        <div className={s.docBody}>
          <div className={s.bubble}>{DEMO_SOURCE_PRESENTATION.message}</div>
          <div className={s.line} style={{ marginTop: 10, borderTop: '1px solid #f0efec' }}><span className={s.muted}>Received</span><span data-end>Nothing</span></div>
          <div className={s.line}><span className={s.muted}>Asks for</span><span data-end>Full refund · {refund}</span></div>
        </div>
      </Doc>}>{reported[1]}</Tile>
    </Tiles>
  </Shell>;
}

function TheRecords({ detail }: { detail: BreakdownDetail }) {
  const [warehouse, carrier, custody] = detail.facts;
  const stops: { source: Source; label: string; time: string; kind?: 'gap' | 'finding'; dashed?: boolean }[] = [
    { source: 'Shopify', label: 'Paid', time: launch.evidence.paidAt },
    { source: 'ShipBob', label: 'Packed', time: launch.evidence.packedAt },
    { source: 'ShipBob', label: 'Handed to carrier', time: launch.evidence.handedToCarrierAt },
    { source: 'Carrier', label: 'Collected', time: launch.evidence.collectedAt, dashed: true },
    { source: 'Carrier', label: 'Delivery scan', time: launch.evidence.deliveryScan, kind: 'gap', dashed: true },
    { source: 'Carrier', label: 'Loss confirmed', time: launch.evidence.lossConfirmedAt, kind: 'finding' },
  ];
  return <Shell lead={detail.lead}>
    <Stage label={`Custody timeline for ${launch.reference}`}>
      <Doc head={<><Mark />{launch.reference} · Evidence timeline</>} end={`${launch.item} · ${launch.sku}`}>
        <ol className={s.timeline} style={{ margin: 0, paddingBottom: 18, listStyle: 'none' }}>
          {stops.map((stop) => <li key={stop.label} className={s.stop} data-next={stop.dashed ? 'dashed' : undefined}>
            <span className={s.stopSource}><SourceMark name={stop.source} />{stop.source}</span>
            <span className={s.stopDot} data-kind={stop.kind} aria-hidden="true" />
            <span className={s.stopLabel}>{stop.label}</span>
            <span className={s.stopTime}>{stop.time}</span>
          </li>)}
        </ol>
      </Doc>
    </Stage>
    <div className={s.caption}><h3>{custody[0]}</h3><p>{custody[1]}</p></div>
    <Tiles cols={2}>
      <Tile title={warehouse[0]} media={<Doc head={<><SourceMark name="ShipBob" />3PL record · {launch.reference}</>}>
        <div className={s.docBody}>
          <div className={s.line}><span className={s.muted}>Packed</span><span data-end>{launch.evidence.packedAt}</span><Check /></div>
          <div className={s.line}><span className={s.muted}>Handed to carrier</span><span data-end>{launch.evidence.handedToCarrierAt}</span><Check /></div>
          <div className={s.line}><span className={s.muted}>Contents</span><span data-end>{launch.sku} × 1</span><Check /></div>
        </div>
      </Doc>}>{warehouse[1]}</Tile>
      <Tile title={carrier[0]} media={<Doc head={<><SourceMark name="Carrier" />Carrier record · {launch.reference}</>}>
        <div className={s.docBody}>
          <div className={s.line}><span className={s.muted}>Collection scan</span><span data-end>Collected {launch.evidence.collectedAt}</span><Check /></div>
          <div className={s.line}><span className={s.muted}>Delivery scan</span><span data-end>{launch.evidence.deliveryScan}</span><span className={s.gapDot} aria-hidden="true" /></div>
          <div className={s.line}><span className={s.muted}>Investigation</span><span data-end>Loss confirmed {launch.evidence.lossConfirmedAt}</span><Check /></div>
        </div>
      </Doc>}>{carrier[1]}</Tile>
    </Tiles>
  </Shell>;
}

const decisionConditions = [
  ['ShipBob', '3PL handed it to the carrier'],
  ['Carrier', 'Carrier confirms loss after collection'],
  ['Shopify', 'No earlier refund on this order'],
  ['Unauth', `${refund} is not above ${threshold}`],
] as const;

function TheDecision({ detail }: { detail: BreakdownDetail }) {
  const [applied, matched, other] = detail.facts;
  return <Shell lead={detail.lead}>
    <Stage dots label="Four matched conditions select two separate outcomes">
      <div className={s.mergeSplit}>
        <div className={s.mergeCol} style={{ '--n': 4 } as CSSProperties}>
          {decisionConditions.map(([source, condition]) => <span key={condition} className={s.chip}><SourceMark name={source} />{condition}<span style={{ marginLeft: 'auto' }}><Check /></span></span>)}
        </div>
        <svg className={s.mergeLines} width="48" height="236" viewBox="0 0 44 100" preserveAspectRatio="none" aria-hidden="true">
          {[12.5, 37.5, 62.5, 87.5].map((y) => <path key={y} d={`M0 ${y} C 24 ${y}, 20 50, 44 50`} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className={s.mergeNode}><Mark size={14} /><span className={s.strong} style={{ display: 'block', marginTop: 8 }}>{launch.customerPolicy.name}</span><span className={s.muted}>4 of 4 conditions matched</span></div>
        <svg className={s.mergeLines} width="48" height="236" viewBox="0 0 44 100" preserveAspectRatio="none" aria-hidden="true">
          {[25, 75].map((y) => <path key={y} d={`M0 50 C 24 50, 20 ${y}, 44 ${y}`} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className={s.mergeCol} style={{ '--n': 2 } as CSSProperties}>
          <div className={s.doc}><Outcome tone="refund" label="Customer outcome" value={`Refund ${refund}`} state={<Pill tone="positive">Issued</Pill>} /></div>
          <div className={s.doc}><Outcome tone="recovery" label="Recovery outcome" value={`Claim up to ${ceiling}`} state={<Pill tone="review">Blocked</Pill>} /></div>
        </div>
      </div>
    </Stage>
    <div className={s.caption}><h3>{applied[0]}</h3><p>{applied[1]}</p></div>
    <Tiles cols={2}>
      <Tile title={matched[0]} media={<Doc head={<><Mark />{launch.customerPolicy.name}</>} end={<Pill tone="positive">4 of 4</Pill>}>
        <div className={s.docBody}>{decisionConditions.map(([source, condition]) => <div key={condition} className={s.line}><SourceMark name={source} />{condition}<span data-end><Check /></span></div>)}</div>
      </Doc>}>{matched[1]}</Tile>
      <Tile title={other[0]} media={<Doc head={<><Mark />Other published gates</>}>
        {[0, 2, 5].map((index) => { const gate = launch.gates[index]; return <div key={gate.condition} className={s.gateRow}><span className={s.gateNo}>{index + 1}</span><span>{gate.condition}</span><Pill tone={gate.tone === 'neutral' ? 'quiet' : gate.tone}>{gate.route}</Pill></div>; })}
      </Doc>}>{other[1]}</Tile>
    </Tiles>
  </Shell>;
}

/* ============ Your rules · Your evidence ============ */
function YourRules({ detail }: { detail: BreakdownDetail }) {
  const [documents, policy, agreement] = detail.facts;
  return <Shell lead={detail.lead}>
    <Stage dots label="From upload to a published version">
      <div>
        <ol className={s.pipeline} style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {launch.setupStages.map((stage, index) => <li key={stage.label} className={s.pipeStep} data-final={index === launch.setupStages.length - 1 || undefined}>
            <span className={s.pipeIcon}><Icon d={[I.upload, I.extract, I.review, I.check][index]} size={14} stroke={1.7} /></span>
            <span><b>{stage.label}</b><span className={s.muted} style={{ display: 'block', marginTop: 2 }}>{stage.detail}</span></span>
          </li>)}
        </ol>
        <div className={s.published}>
          <span className={s.chip}><Check />{launch.customerPolicy.name}<span className={s.muted}>· {launch.customerPolicy.state.toLowerCase()}</span></span>
          <span className={s.chip}><Check />{launch.recoveryAgreement.name}<span className={s.muted}>· clauses reviewed · {launch.recoveryAgreement.state.toLowerCase()}</span></span>
        </div>
      </div>
    </Stage>
    <div className={s.caption}><h3>{documents[0]}</h3><p>{documents[1]}</p></div>
    <Tiles cols={2}>
      <Tile title={policy[0]} media={<Doc head={<><Icon d={I.document} size={13} stroke={1.7} />{launch.customerPolicy.name}</>} end={<Pill tone="positive">{launch.customerPolicy.state}</Pill>}>
        <div className={s.docBody}>
          <div className={s.line}><span className={s.muted}>Refund action</span><span data-end>{launch.customerPolicy.actionMode}</span></div>
          <div className={s.line}><span className={s.muted}>Review</span><span data-end>Proposed refunds above {threshold}</span></div>
        </div>
      </Doc>}>{policy[1]}</Tile>
      <Tile title={agreement[0]} media={<Doc head={<><Icon d={I.document} size={13} stroke={1.7} />{launch.recoveryAgreement.name}</>} end={<Pill tone="positive">{launch.recoveryAgreement.state}</Pill>}>
        <div className={s.docBody}>
          <div className={s.line}><span className={s.muted}>Clauses</span><span data-end>Reviewed</span><Check /></div>
          <div className={s.line}><span className={s.muted}>Recovery ceiling</span><span data-end>{ceiling}</span></div>
        </div>
      </Doc>}>{agreement[1]}</Tile>
    </Tiles>
  </Shell>;
}

const evidenceMap = [
  ['Carrier status', 'Carrier status is lost after collection', `Confirmed ${launch.evidence.lossConfirmedAt}`],
  ['3PL records', '3PL record shows handed to carrier', launch.evidence.collectedAt],
  ['Refund amount', `Proposed refund is not above ${threshold}`, refund],
  ['Previous refunds', 'Earlier refunds are none', gbp(launch.evidence.priorRefund)],
] as const;

function YourEvidence({ detail }: { detail: BreakdownDetail }) {
  const [control] = detail.facts;
  return <Shell lead={detail.lead}>
    <Stage dots label={`Evidence used to decide ${launch.reference}`}>
      <div>
        <div className={s.mapHead}><span>Evidence</span><span /><span>Condition in your policy · {launch.reference}</span></div>
        <div className={s.mapping}>
          {evidenceMap.map(([evidence, condition, value]) => <div key={evidence} style={{ display: 'contents' }}>
            <span className={s.chip}><span className={s.dot} />{evidence}</span>
            <Arrow />
            <span className={s.chip} style={{ justifyContent: 'space-between' }}><span>{condition}</span><span className={s.muted} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Check />{value}</span></span>
          </div>)}
        </div>
        <div className={s.outcomes} style={{ marginTop: 16 }}>{(['Customer history', 'Previous claims', 'Delivery proof', 'Payment records'] as const).map((label) => <span key={label} className={s.chip} data-muted>{label}</span>)}</div>
      </div>
    </Stage>
    <div className={s.split}>
      <div className={s.tileMedia} style={{ padding: 18 }}>
        <Doc head={<><Mark />Required for this rule</>}>
          <div className={s.docBody}>{evidenceMap.map(([evidence]) => <div key={evidence} className={s.line}><span className={s.dot} />{evidence}<span data-end><Pill tone="quiet">Required</Pill></span></div>)}</div>
          <div className={s.gateRow} style={{ borderTop: '1px solid #e4e3e0', borderBottom: 0 }}><span className={s.gateNo}>3</span><span>{launch.gates[2].condition}</span><Pill>{launch.gates[2].route}</Pill></div>
        </Doc>
      </div>
      <div className={s.splitText}><h3>{control[0]}</h3><p>{control[1]}</p></div>
    </div>
  </Shell>;
}

/* ============ Your gates ============ */
function YourGates({ detail }: { detail: BreakdownDetail }) {
  const [rule, together] = detail.facts;
  const details: (string | undefined)[] = [`${gbp(launch.evidence.priorRefund)} earlier refunds`, `${refund} is not above ${threshold}`, undefined, undefined, `Matched ${launch.reference}`];
  return <Shell lead={detail.lead}>
    <Stage dots label={`Gate evaluation for ${launch.reference}`}>
      <div className={s.trace}>
        <Doc head={<><Mark />Gates · {launch.reference}</>} end={`${launch.gates.length} published`}>
          {launch.gates.map((gate, index) => {
            const state = index < 4 ? 'passed' : index === 4 ? 'matched' : 'na';
            return <div key={gate.condition} className={s.gateRow} data-state={state}>
              <span className={s.gateNo}>{index + 1}</span>
              <span>{gate.condition}{details[index] && <span className={s.gateDetail}>{details[index]}</span>}</span>
              {state === 'passed' ? <Pill tone="quiet"><Check size={12} />Passed</Pill> : state === 'matched' ? <Pill tone="accent">{gate.route}</Pill> : <span className={s.muted} style={{ fontSize: 11.5 }}>Not applicable</span>}
            </div>;
          })}
        </Doc>
        <Arrow />
        <div className={s.routeCard}>
          <span className={s.label}>Route for {launch.reference}</span>
          <span style={{ font: '500 16px/22px Inter,sans-serif', letterSpacing: '-.01em' }}>{launch.gates[4].route}</span>
          <div className={s.outcomeChip}><span className={s.outcomeIcon}><Icon d={I.cash} size={13} stroke={1.8} /></span>Issue refund {refund}</div>
          <div className={s.outcomeChip}><span className={s.outcomeIcon} data-tone="recovery"><Icon d={I.recover} size={13} stroke={1.8} /></span>Assess carrier claim up to {ceiling}</div>
        </div>
      </div>
    </Stage>
    <Tiles cols={2}>
      <Tile title={rule[0]} media={<Doc head={<><Mark />{launch.customerPolicy.name}</>} end={<Pill tone="positive">{launch.customerPolicy.state}</Pill>}>
        <dl className={s.ruleSheet} style={{ margin: 0, padding: '2px 14px 4px' }}>
          <dt>When</dt><dd>A customer reports an item not received</dd>
          <dt>If</dt><dd>Carrier status is lost after collection</dd>
          <dt>and</dt><dd>3PL record shows handed to carrier</dd>
          <dt>and</dt><dd>Proposed refund is not above {threshold}</dd>
          <dt>and</dt><dd>Earlier refunds are none</dd>
          <dt>Then</dt><dd>Issue refund {refund} + assess carrier claim up to {ceiling}</dd>
          <dt>Otherwise</dt><dd>{launch.recovery.owner} reviews it</dd>
        </dl>
      </Doc>}>{rule[1]}</Tile>
      <Tile title={together[0]} media={<div style={{ display: 'grid', gap: 14 }}>
        <div className={s.doc} style={{ padding: '4px 16px 14px' }}>
          <div className={s.ruler}>
            <div className={s.rulerBar}><span /><span /></div>
            <span className={s.rulerMark} data-kind="case" style={{ left: `${(launch.customerResolution.amount / 70000) * 100}%` }}><b>{refund}</b></span>
            <span className={s.rulerMark} style={{ left: `${(launch.customerPolicy.proposedRefundReview.amount / 70000) * 100}%` }}><b>{threshold}</b></span>
          </div>
          <div className={s.rulerZones} style={{ marginTop: -24 }}><span>Automatic</span><span>Review</span></div>
        </div>
        <div className={s.doc} style={{ padding: '10px 12px 12px' }}>
          <span className={s.label} style={{ marginBottom: 8 }}>Action mode · refund</span>
          <div className={s.segmented}><span>Observe-only</span><span>Approval</span><span data-on>{launch.customerPolicy.actionMode}</span></div>
        </div>
        <span className={s.chip} style={{ justifySelf: 'start' }}><Icon d={I.bot} size={14} stroke={1.8} />Your AI support agent passes the same gates</span>
      </div>}>{together[1]}</Tile>
    </Tiles>
  </Shell>;
}

/* ============ The three case comparisons ============ */
function NotReceived({ detail }: { detail: BreakdownDetail }) {
  const [evidence, decision] = detail.facts;
  return <Shell lead={detail.lead}>
    <Stage label={`How ${launch.reference} was decided`}>
      <DecisionFlow reference={launch.reference} rule={DEMO_LANDING_POLICY_OUTCOMES['not-received'].rule}
        evidence={[['ShipBob', '3PL handover confirmed'], ['Carrier', 'Carrier loss confirmed'], ['Shopify', 'No earlier refund'], ['Unauth', `${refund} not above review limit`]]}
        outcomes={<>
          <Outcome tone="refund" label="Customer" value={`Refund ${refund}`} state={<Pill tone="positive">Issued</Pill>} />
          <Outcome tone="recovery" label="Recovery" value={`Claim up to ${ceiling}`} state={<Pill tone="review">Blocked</Pill>} />
        </>} />
    </Stage>
    <Tiles cols={2}>
      <Tile title={evidence[0]} media={<Doc head={<><SourceMark name="Carrier" />Carrier record · {launch.reference}</>}>
        <div className={s.docBody}>
          <div className={s.line}><span className={s.muted}>Collection scan</span><span data-end>Collected {launch.evidence.collectedAt}</span><Check /></div>
          <div className={s.line}><span className={s.muted}>Delivery scan</span><span data-end>{launch.evidence.deliveryScan}</span><span className={s.gapDot} aria-hidden="true" /></div>
          <div className={s.line}><span className={s.muted}>Investigation</span><span data-end>Loss confirmed {launch.evidence.lossConfirmedAt}</span><Check /></div>
          <div className={s.line}><span className={s.muted}>Handed over by</span><span data-end>ShipBob · {launch.evidence.handedToCarrierAt}</span><Check /></div>
        </div>
      </Doc>}>{evidence[1]}</Tile>
      <Tile title={decision[0]} media={<div className={s.lanes}>
        <div className={s.lane}><span className={s.label}>Customer</span><div className={s.laneTrack}><span className={s.chip}><Icon d={I.cash} size={14} stroke={1.8} />Refund {refund}</span><span className={s.laneLink} /><span className={s.chip}><Check />{launch.customerResolution.provider} confirmed</span></div></div>
        <div className={s.lane}><span className={s.label}>Recovery</span><div className={s.laneTrack}><span className={s.chip}><Icon d={I.recover} size={14} stroke={1.8} />Claim up to {ceiling}</span><span className={s.laneLink} data-state="waiting" /><span className={s.chip}><Avatar initials={launch.recovery.ownerInitials} />Claimant and channel</span></div></div>
      </div>}>{decision[1]}</Tile>
    </Tiles>
  </Shell>;
}

function WrongItem({ detail }: { detail: BreakdownDetail }) {
  const [evidence, decision] = detail.facts;
  const refundAmount = gbp(24800);
  const warehouseCeiling = gbp(15000);
  return <Shell lead={detail.lead}>
    <Stage label="How SAMPLE-248 was decided">
      <DecisionFlow reference="SAMPLE-248" rule={DEMO_LANDING_POLICY_OUTCOMES.recoverable.rule}
        evidence={[['3PL', 'Packing error acknowledged'], ['Store', 'No earlier refund'], ['Agreement', `${warehouseCeiling} recovery ceiling`]]}
        outcomes={<>
          <Outcome tone="refund" label="Customer" value={`Refund ${refundAmount}`} />
          <Outcome tone="recovery" label="Warehouse recovery" value={`Up to ${warehouseCeiling}`} state={<Pill tone="review">Capped</Pill>} />
        </>} />
    </Stage>
    <Tiles cols={2}>
      <Tile title={evidence[0]} media={<Compare verdict="Packing error acknowledged"
        left={{ src: DEMO_PRESENTATION.recoverable.image, alt: 'Ordered item: wool coat', caption: `Ordered · ${DEMO_PRESENTATION.recoverable.sku}` }}
        right={{ src: '/demo/evidence/wrong-item-packing.jpg', alt: 'Packing photo: a grey shirt in the parcel instead of the ordered wool coat', caption: 'Packing photo' }} />}>{evidence[1]}</Tile>
      <Tile title={decision[0]} media={<div className={s.doc} style={{ padding: '16px 16px 18px' }}>
        <div className={s.bars}>
          <div className={s.bar}><div><span>Refund to the customer</span><span className={s.strong}>{refundAmount}</span></div><div className={s.barTrack}><div className={s.barFill} style={{ width: '100%' }} /></div></div>
          <div className={s.bar}><div><span>Warehouse recovery ceiling</span><span className={s.strong}>{warehouseCeiling}</span></div><div className={s.barTrack}><div className={s.barFill} data-tone="recovery" style={{ width: `${(15000 / 24800) * 100}%` }} /></div></div>
        </div>
      </div>}>{decision[1]}</Tile>
    </Tiles>
  </Shell>;
}

function DamagedItem({ detail }: { detail: BreakdownDetail }) {
  const [evidence, decision] = detail.facts;
  const bowl = DEMO_PRESENTATION.legitimate;
  return <Shell lead={detail.lead}>
    <Stage label="How SAMPLE-096 was decided">
      <DecisionFlow reference="SAMPLE-096" rule={DEMO_LANDING_POLICY_OUTCOMES.legitimate.rule}
        evidence={[['Photo', 'Damage photo matches'], ['Store', 'No prior concession'], ['3PL', 'Stock available']]}
        outcomes={<>
          <Outcome tone="replace" label="Customer" value="Send replacement" />
          <div className={s.outcomeRow}><img className={s.thumb} src={bowl.image} alt="" width="40" height="40" /><div><span className={s.label}>Same item</span><span className={s.strong}>{bowl.sku} · Qty 1</span></div></div>
        </>} />
    </Stage>
    <Tiles cols={2}>
      <Tile title={evidence[0]} media={<Compare verdict="Damage photo matches"
        left={{ src: '/demo/evidence/damaged-bowl.jpg', alt: 'Customer photo: a chipped rim on the ceramic serving bowl', caption: 'Customer photo' }}
        right={{ src: bowl.image, alt: 'Ordered item: ceramic serving bowl', caption: `Ordered · ${bowl.sku}` }} />}>{evidence[1]}</Tile>
      <Tile title={decision[0]} media={<Doc head={<><Mark />Replacement · SAMPLE-096</>}>
        <div className={s.docBody}>
          <div className={s.line} style={{ paddingBottom: 8 }}><img className={s.thumb} src={bowl.image} alt="" width="40" height="40" /><div><span className={s.strong} style={{ display: 'block' }}>{bowl.item}</span><span className={s.label}>{bowl.sku} · Qty 1</span></div></div>
          <div className={s.line}><span className={s.muted}>Remedy</span><span data-end>Same item</span></div>
          <div className={s.line}><span className={s.muted}>Stock</span><span data-end>Available</span><Check /></div>
        </div>
      </Doc>}>{decision[1]}</Tile>
    </Tiles>
  </Shell>;
}

/* ============ Recovery and money ============ */
function CustomerRefunded({ detail }: { detail: BreakdownDetail }) {
  const [pack, ownership] = detail.facts;
  return <Shell lead={detail.lead}>
    <Stage label="Customer resolution and recovery run on separate tracks">
      <div className={s.fork}>
        <div className={s.forkOrigin}><span className={s.label}>Policy decision</span><span className={s.strong} style={{ display: 'block', marginTop: 2 }}>{launch.reference}</span><span className={s.muted}>{launch.customerResolution.decidedAt}</span></div>
        <div className={s.forkLines} aria-hidden="true" />
        <div className={s.forkBranches}>
          <div className={s.branch}><span className={s.branchLabel}>Customer</span><span className={s.chip}><Icon d={I.cash} size={14} stroke={1.8} />Refund {refund} issued automatically</span><span className={s.laneLink} /><span className={s.chip}><Check />{launch.customerResolution.provider} confirmed</span></div>
          <div className={s.branch}><span className={s.branchLabel}>Recovery</span><span className={s.chip}><Icon d={I.document} size={14} stroke={1.7} />Evidence pack · 4 records</span><span className={s.laneLink} /><span className={s.chip}><span className={s.dot} />Blocked · {launch.recovery.blockedAt}</span><span className={s.laneLink} data-state="waiting" /><span className={s.chip}><Avatar initials={launch.recovery.ownerInitials} />{launch.recovery.owner}</span></div>
        </div>
      </div>
    </Stage>
    <Tiles cols={2}>
      <Tile title={pack[0]} media={<div className={s.pack}>
        <span className={s.packTab}><Icon d={I.document} size={12} stroke={1.8} />{launch.reference} · {launch.recoveryAgreement.name}</span>
        <Doc head={<>Supporting evidence</>} end={`Up to ${ceiling}`} foot={<><span className={s.dot} />Submission blocked · claimant and channel</>}>
          <div className={s.docBody}>
            {([['Shopify', 'Order record'], ['ShipBob', 'Handover scan'], ['Carrier', 'Collection scan'], ['Carrier', 'Loss confirmation']] as const).map(([source, record]) => <div key={record} className={s.line}><SourceMark name={source} />{record}<span data-end className={s.muted}>{source}</span><Check /></div>)}
          </div>
        </Doc>
      </div>}>{pack[1]}</Tile>
      <Tile title={ownership[0]} media={<Doc head={<><Mark />Work · {launch.reference}</>} end={<Pill tone="review">Blocked</Pill>} foot={<span className={s.outcomes} style={{ margin: 0 }}>{['Rejection', 'Short payment', 'Reconciliation', 'Authorised end to pursuit'].map((outcome) => <Pill key={outcome} tone="quiet">{outcome}</Pill>)}</span>}>
        <div className={s.docBody}>
          <div className={s.line} style={{ padding: '4px 0 10px' }}><Avatar initials={launch.recovery.ownerInitials} large /><div><span className={s.strong} style={{ display: 'block' }}>{launch.recovery.owner}</span><span className={s.label}>Next: {launch.recovery.blocker.toLowerCase()}</span></div></div>
          <div className={s.line}><span className={s.muted}>If unresolved</span><span data-end>{launch.recovery.reviewIfUnresolved}</span></div>
        </div>
      </Doc>}>{ownership[1]}</Tile>
    </Tiles>
  </Shell>;
}

function LaterResult({ detail }: { detail: BreakdownDetail }) {
  const [chronology, result] = detail.facts;
  const refunded = launch.customerResolution.amount;
  const pct = (minor: number) => `${(minor / refunded) * 100}%`;
  return <Shell lead={detail.lead}>
    <Stage label="Claim stages and money stages">
      <Doc head={<><Mark />Payment records / {launch.reference}</>} end={<Pill tone="positive">As at {day(launch.recovery.reconciledAt)} · reconciled</Pill>}>
        <div className={s.money} style={{ padding: '22px 22px 20px' }}>
          <div className={s.moneyLane}>
            <span className={s.moneyLaneLabel}>The claim</span>
            <div className={s.moneyStage}><b>Prepared</b>{launch.recovery.blockedAt}</div>
            <div className={s.moneyStage}><b>Submitted</b>{launch.recovery.submittedAt}</div>
            <div className={s.moneyStage} data-state="approved"><b>Approved</b>{launch.recovery.approvedAt}<span style={{ color: '#1c1f23' }}>{recovered} approved</span></div>
          </div>
          <div className={s.moneyGap}><span><Pill tone="accent">Approval ≠ payment</Pill></span></div>
          <div className={s.moneyLane} data-lane="money">
            <span className={s.moneyLaneLabel}>The money</span>
            <div className={s.moneyStage} data-state="money"><b>Received</b>{launch.recovery.receivedAt}<span style={{ color: '#1c1f23' }}>{recovered} received</span></div>
            <div className={s.moneyStage} data-state="money"><b>Matched</b>{launch.recovery.matchedAt}</div>
            <div className={s.moneyStage} data-state="money"><b>Reconciled</b>{launch.recovery.reconciledAt}</div>
          </div>
        </div>
      </Doc>
    </Stage>
    <Tiles cols={2}>
      <Tile title={chronology[0]} media={<div style={{ display: 'grid', gap: 12 }}>
        <div className={s.match}>
          <div className={s.matchCard}>Receipt · {day(launch.recovery.receivedAt)}<b>{recovered}</b></div>
          <span className={s.matchLink}><Icon d={I.link} size={18} stroke={1.7} /></span>
          <div className={s.matchCard}>Approved claim · {day(launch.recovery.approvedAt)}<b>{recovered}</b></div>
        </div>
        <div className={s.doc} style={{ padding: '4px 14px' }}>
          <div className={s.line}><Check />Matched<span data-end className={s.muted}>{launch.recovery.matchedAt}</span></div>
          <div className={s.line}><Check />Reconciled<span data-end className={s.muted}>{launch.recovery.reconciledAt}</span></div>
        </div>
      </div>}>{chronology[1]}</Tile>
      <Tile title={result[0]} media={<div className={s.doc} style={{ padding: '30px 18px 14px' }}>
        <div className={s.bridge} role="img" aria-label={`${refund} refunded, ${recovered} recovered, ${balance} unrecovered refund balance`}>
          <div className={s.bridgeCol}><div className={s.bridgeBar} style={{ bottom: 0, height: '100%' }}><span className={s.bridgeValue} style={{ top: 0 }}>{refund}</span></div></div>
          <div className={s.bridgeCol}><div className={s.bridgeBar} data-tone="money" style={{ bottom: pct(launch.money.unrecoveredRefundBalance), height: pct(launch.money.recovered) }}><span className={s.bridgeValue} style={{ top: 0 }}>− {recovered}</span></div></div>
          <div className={s.bridgeCol}><div className={s.bridgeBar} data-tone="balance" style={{ bottom: 0, height: pct(launch.money.unrecoveredRefundBalance) }}><span className={s.bridgeValue} style={{ top: 0 }}>{balance}</span></div></div>
        </div>
        <div className={s.bridgeLabels} aria-hidden="true"><span>Refunded</span><span>Recovered</span><span>Unrecovered refund balance</span></div>
      </div>}>{result[1]}</Tile>
    </Tiles>
  </Shell>;
}

/* ============ Work, rules, tools, history ============ */
const queue = [
  { owner: 'Amelia', initials: 'AR', tone: undefined, tasks: [
    { context: `${launch.reference} · Not received`, task: launch.recovery.blocker, status: <Pill tone="review">Blocked</Pill> },
    { context: 'SAMPLE-248 · Wrong item', task: `Submit the 3PL claim for ${gbp(15000)}`, status: <span className={s.muted}>26 Sep</span> },
  ] },
  { owner: 'Theo', initials: 'TM', tone: 'green' as const, tasks: [
    { context: 'SAMPLE-096 · Damaged item', task: 'Confirm replacement dispatch', status: <Pill tone="accent">Today</Pill> },
    { context: 'SAMPLE-128 · Repeat request', task: 'Review the duplicate-payout exception', status: <Pill tone="accent">Today</Pill> },
  ] },
  { owner: 'Rahul', initials: 'RM', tone: 'blue' as const, tasks: [
    { context: `${launch.reference} · Not received`, task: `Review ${balance} unrecovered refund balance`, status: <span className={s.muted}>30 Sep</span> },
  ] },
];

function NextStep({ detail }: { detail: BreakdownDetail }) {
  const [attention, owner] = detail.facts;
  return <Shell lead={detail.lead}>
    <Stage dots label="Open tasks grouped by owner">
      <div className={s.board}>
        {queue.map((column) => <div key={column.owner} className={s.boardCol}>
          <div className={s.boardHead}><Avatar initials={column.initials} tone={column.tone} />{column.owner}<span data-end>{column.tasks.length} open</span></div>
          {column.tasks.map((task) => <div key={task.task} className={s.task}><div data-top><span data-meta>{task.context}</span>{task.status}</div><span>{task.task}</span></div>)}
        </div>)}
      </div>
    </Stage>
    <Tiles cols={2}>
      <Tile title={attention[0]} media={<div className={s.kinds}>
        {([[I.missing, 'Missing evidence'], [I.document, 'A claim to prepare'], [I.message, 'A response to review'], [I.receipt, 'A payment to check']] as const).map(([glyph, label]) => <div key={label} className={s.kind}><span className={s.kindIcon}><Icon d={glyph} size={14} stroke={1.6} /></span>{label}</div>)}
      </div>}>{attention[1]}</Tile>
      <Tile title={owner[0]} media={<div>
        <div className={s.annotated}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className={s.pin}>1</span><span className={s.label} style={{ display: 'inline' }}>{launch.reference} · Not received</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}><span className={s.pin}>2</span><span>{launch.recovery.blocker}</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0efec' }}><span className={s.pin}>3</span><Avatar initials={launch.recovery.ownerInitials} />{launch.recovery.owner}<span style={{ marginLeft: 'auto' }}><Pill tone="review">Blocked</Pill></span></div>
        </div>
        <div className={s.legend}><span><span className={s.pin}>1</span>Linked case</span><span><span className={s.pin}>2</span>Next action</span><span><span className={s.pin}>3</span>Named teammate</span></div>
      </div>}>{owner[1]}</Tile>
    </Tiles>
  </Shell>;
}

function BetterDecision({ detail }: { detail: BreakdownDetail }) {
  const [preview] = detail.facts;
  const max = 56000;
  const x = (minor: number) => `${(minor / max) * 100}%`;
  const proposed = 20000;
  const cases = [
    { reference: launch.reference, amount: launch.customerResolution.amount },
    { reference: 'SAMPLE-248', amount: 24800 },
    { reference: 'SAMPLE-128', amount: 12800 },
    { reference: 'SAMPLE-096', amount: 9600 },
  ];
  return <Shell lead={detail.lead}>
    <Stage label={`Proposed change: review refunds above ${gbp(proposed)} instead of ${threshold}`}>
      <Doc head={<><Mark />Rules / Refunds above {threshold}</>} end={<Pill tone="review">Draft</Pill>}>
        <div className={s.strip}>
          <div className={s.stripPlot} aria-hidden="true">
            <span className={s.stripZone} style={{ left: x(proposed) }}><em>Review above {gbp(proposed)}</em></span>
            <span className={s.stripLimit} style={{ left: x(launch.customerPolicy.proposedRefundReview.amount) }}><em>Now {threshold}</em></span>
          </div>
          {cases.map((c) => <div key={c.reference} className={s.stripRow}>
            <span className={s.stripLabel}>{c.reference}</span>
            <span className={s.stripTrack}><i data-escalates={c.amount > proposed || undefined} style={{ left: x(c.amount) }} /><b style={{ left: x(c.amount) }}>{gbp(c.amount)}</b></span>
          </div>)}
          <div className={s.stripAxis} aria-hidden="true"><span /><span className={s.stripTicks}>{[0, 10000, 20000, 30000, 40000, 50000].map((tick) => <span key={tick} style={{ left: x(tick) }}>{gbp(tick).replace('.00', '')}</span>)}</span></div>
        </div>
        <div className={s.stats} style={{ borderTop: '1px solid #e4e3e0' }}>
          <div>Cases checked<b>4</b></div><div>Would change<b>2</b></div><div>Sent to review<b>{gbp(49600)}</b></div>
        </div>
      </Doc>
    </Stage>
    <Tiles cols={2}>
      <Tile title={preview[0]} media={<Doc head={<><Mark />Preview</>}>
        <div className={s.docBody}>
          <div className={s.line}>Review refunds above<span data-end><span className={s.muted} style={{ textDecoration: 'line-through' }}>{threshold}</span> → <b style={{ fontWeight: 500 }}>{gbp(proposed)}</b></span></div>
          {cases.map((c) => <div key={c.reference} className={s.line}><span className={s.muted}>{c.reference} · {gbp(c.amount)}</span><span data-end>{c.amount > proposed ? <Pill tone="review">Now escalates</Pill> : <span className={s.muted}>No change</span>}</span></div>)}
        </div>
      </Doc>}>{preview[1]}</Tile>
      <Tile title="Publish" media={<Doc head={<><Mark />Rules / Refunds</>}>
        <div className={s.docBody}>
          <div className={s.line}><Pill tone="positive">Published</Pill>Review refunds above {threshold}</div>
          <div className={s.line} style={{ minHeight: 44 }}><Pill tone="review">Draft</Pill>Review refunds above {gbp(proposed)}<span data-end><span className={s.publishButton}>Publish</span></span></div>
        </div>
      </Doc>}>Nothing changes until you publish.</Tile>
    </Tiles>
  </Shell>;
}

const toolGroups: { label: string; logos: { src: string; alt: string; wide?: boolean }[] }[] = [
  { label: 'Stores', logos: [{ src: '/providers/shopify.svg', alt: 'Shopify' }, { src: '/providers/woo-wordmark.svg', alt: 'WooCommerce', wide: true }, { src: '/providers/bigcommerce.svg', alt: 'BigCommerce' }] },
  { label: 'Helpdesks', logos: [{ src: '/providers/gorgias.png', alt: 'Gorgias' }, { src: '/providers/zendesk.svg', alt: 'Zendesk' }, { src: '/providers/freshdesk.png', alt: 'Freshdesk' }] },
  { label: 'Warehouses', logos: [{ src: '/providers/shipbob.svg', alt: 'ShipBob' }] },
  { label: 'Carriers', logos: [{ src: '/providers/ups.svg', alt: 'UPS' }, { src: '/providers/fedex-wordmark.png', alt: 'FedEx', wide: true }] },
  { label: 'Documents', logos: [{ src: '/providers/document-upload.svg', alt: 'Documents and imports' }] },
];

function FamiliarTools({ detail }: { detail: BreakdownDetail }) {
  const [records, agreements] = detail.facts;
  return <Shell lead={detail.lead}>
    <Stage dots label="Stores, helpdesks, warehouses, carriers and documents feed one case">
      <div className={s.hub}>
        <div className={s.groups}>
          {toolGroups.map((group) => <div key={group.label} className={s.group}><span>{group.label}</span><div className={s.logos}>{group.logos.map((logo) => <span key={logo.alt} className={s.logoTile}><img src={logo.src} alt={logo.alt} data-wide={logo.wide || undefined} /></span>)}</div></div>)}
        </div>
        <svg className={s.converge} width="500" height="44" viewBox="0 0 500 44" preserveAspectRatio="none" aria-hidden="true">
          {[50, 150, 250, 350, 450].map((from) => <path key={from} d={`M${from} 0 C ${from} 24, 250 20, 250 44`} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className={s.caseNode}><span><Mark size={15} /></span><div><span className={s.label}>One connected case</span><span className={s.strong}>{launch.reference} · Item not received</span></div></div>
      </div>
    </Stage>
    <Tiles cols={2}>
      <Tile title={records[0]} media={<div className={s.merge}>
        {([['Shopify', 'Order record'], ['Gorgias', 'Customer report'], ['ShipBob', '3PL record'], ['Carrier', 'Carrier record'], ['Agreement', 'Documents and imports']] as const).map(([source, record]) => <span key={record} className={s.chip} data-muted={source === 'Agreement' || undefined}><SourceMark name={source} />{record}{source === 'Agreement' && <span style={{ marginLeft: 'auto', fontSize: 11.5 }}>Merchant supplied</span>}</span>)}
      </div>}>{records[1]}</Tile>
      <Tile title={agreements[0]} media={<Doc head={<><Icon d={I.document} size={13} stroke={1.7} />{launch.recoveryAgreement.name}</>} end={<Pill tone="positive">{launch.recoveryAgreement.state}</Pill>}>
        <div className={s.steps} style={{ padding: '14px 14px 16px' }}>
          {launch.setupStages.map((stage, index) => <div key={stage.label} className={s.step} data-final={index === launch.setupStages.length - 1 || undefined}>
            <span><Icon d={[I.upload, I.extract, I.review, I.check][index]} size={13} stroke={1.7} /></span>
            <span><b>{stage.label}</b><span className={s.muted}>{stage.detail}</span></span>
          </div>)}
        </div>
      </Doc>}>{agreements[1]}</Tile>
    </Tiles>
  </Shell>;
}

const refundChecks = [
  { glyph: I.refunded, label: 'Confirm the refund and case evidence' },
  { glyph: I.terms, label: 'Check the terms, claimant and deadline' },
  { glyph: I.search, label: 'Find any existing claim or receipt' },
] as const;

function AlreadyRefunded({ detail }: { detail: BreakdownDetail }) {
  const [review] = detail.facts;
  return <Shell lead={detail.lead}>
    <Stage dots label="The checks an older refund passes before recovery">
      <div className={s.route} style={{ flexDirection: 'column', gap: 0 }}>
        <span className={s.chip}><span className={s.routeIcon}><Icon d={I.cash} size={14} stroke={1.7} /></span>Older refund</span>
        {refundChecks.map((check) => <span key={check.label} style={{ display: 'contents' }}><span className={s.routeLink} style={{ width: 2, height: 16 }} /><span className={s.chip}><span className={s.routeIcon}><Icon d={check.glyph} size={14} stroke={1.6} /></span>{check.label}</span></span>)}
        <span className={s.routeLink} style={{ width: 2, height: 16 }} />
        <span className={s.chip}><span className={s.routeIcon} data-tone="done"><Icon d={I.route} size={14} stroke={1.7} /></span>Valid recovery route</span>
      </div>
    </Stage>
    <div className={s.caption}><h3>{review[0]}</h3><p>{review[1]}</p></div>
    <Tiles cols={3}>
      <Tile title={refundChecks[0].label} media={<Doc head={<><Icon d={I.refunded} size={13} stroke={1.7} />Refund</>}>
        <div className={s.docBody}><div className={s.line}>Refund record<span data-end><Check /></span></div><div className={s.line}>Case evidence<span data-end><Check /></span></div></div>
      </Doc>} />
      <Tile title={refundChecks[1].label} media={<Doc head={<><Icon d={I.document} size={13} stroke={1.7} />Agreement</>}>
        <div className={s.docBody}><div className={s.line}>Terms<span data-end><Check /></span></div><div className={s.line}>Claimant<span data-end><Check /></span></div><div className={s.line}>Deadline<span data-end><Check /></span></div></div>
      </Doc>} />
      <Tile title={refundChecks[2].label} media={<div style={{ display: 'grid', gap: 10 }}>
        <span className={s.field}><Icon d={I.search} size={13} stroke={1.8} />Claims and receipts</span>
        <span style={{ display: 'flex', gap: 6 }}><span className={s.chip}><Icon d={I.document} size={13} stroke={1.7} />Existing claim</span><span className={s.chip}><Icon d={I.receipt} size={13} stroke={1.7} />Receipt</span></span>
      </div>} />
    </Tiles>
  </Shell>;
}

function EveryDecision({ detail }: { detail: BreakdownDetail }) {
  const [history] = detail.facts;
  const trail: { at: string; kind?: 'blocked' | 'approved' | 'money'; text: string }[] = [
    { at: launch.customerResolution.decidedAt, text: 'Policy matched: all required conditions' },
    { at: launch.customerResolution.decidedAt, text: `Refund ${refund} issued · ${launch.customerResolution.provider} confirmed` },
    { at: launch.recovery.blockedAt, kind: 'blocked', text: `Claim blocked: claimant and channel · assigned to ${launch.recovery.owner}` },
    { at: launch.recovery.submittedAt, text: 'Route confirmed · claim submitted' },
    { at: launch.recovery.approvedAt, kind: 'approved', text: `${recovered} approved · payment still outstanding` },
    { at: launch.recovery.receivedAt, kind: 'money', text: `${recovered} received` },
    { at: launch.recovery.reconciledAt, kind: 'money', text: `Payment matched and reconciled · ${balance} refund balance remains` },
  ];
  return <Shell lead={detail.lead}>
    <Stage label={`Decision record for ${launch.reference}`}>
      <Doc head={<><Mark />{launch.reference} · Decision record</>} end={launch.customerResolution.decidedAt}>
        <dl className={s.record} style={{ margin: 0 }}>
          <dt>Evidence</dt><dd>{([['Shopify', 'Order record'], ['ShipBob', 'Handover scan'], ['Carrier', 'Collection scan'], ['Carrier', 'Loss confirmation']] as const).map(([source, record]) => <span key={record} className={s.chip} style={{ minHeight: 26, padding: '2px 8px 2px 3px' }}><SourceMark name={source} />{record}</span>)}</dd>
          <dt>Policy</dt><dd>{launch.customerPolicy.name}<Pill tone="positive">{launch.customerPolicy.state}</Pill><span className={s.muted}>4 of 4 conditions matched</span></dd>
          <dt>Decision</dt><dd><span className={s.strong}>Refund {refund}</span><Pill tone="quiet">{launch.customerResolution.mode}</Pill></dd>
          <dt>Result</dt><dd><Check />{launch.customerResolution.provider} confirmed</dd>
          <dt>Recovery</dt><dd>Claim up to {ceiling}<Pill tone="review">Blocked</Pill><span className={s.muted}>assigned to {launch.recovery.owner}</span></dd>
        </dl>
      </Doc>
    </Stage>
    <div className={s.split}>
      <div className={s.tileMedia} style={{ padding: 18 }}>
        <div className={s.doc} style={{ padding: '14px 14px 5px' }}>
          <div className={s.trail}>{trail.map((row) => <div key={row.text} className={s.trailRow} data-kind={row.kind}><span>{row.at.replace(' · ', ' ')}</span><i aria-hidden="true" /><span>{row.text}</span></div>)}</div>
        </div>
      </div>
      <div className={s.splitText}><h3>{history[0]}</h3><p>{history[1]}</p></div>
    </div>
  </Shell>;
}

const BREAKDOWNS: Record<string, (props: { detail: BreakdownDetail }) => ReactNode> = {
  'The claim': TheClaim,
  'The records': TheRecords,
  'The decision': TheDecision,
  'Your rules': YourRules,
  'Your evidence': YourEvidence,
  'Your gates': YourGates,
  'Not received': NotReceived,
  'Wrong item': WrongItem,
  'Damaged item': DamagedItem,
  'Customer refunded': CustomerRefunded,
  'Later financial result': LaterResult,
  'The next step': NextStep,
  'A better next decision': BetterDecision,
  'Familiar tools': FamiliarTools,
  'Already refunded': AlreadyRefunded,
  'Every decision': EveryDecision,
};

/** Resolves a card's breakdown; unknown ids keep the plain facts so no dialog is ever empty. */
export function LandingBreakdown({ id, detail }: { id: string; detail: BreakdownDetail }) {
  const Breakdown = BREAKDOWNS[id];
  if (Breakdown) return <Breakdown detail={detail} />;
  return <Shell lead={detail.lead}>{detail.facts.map(([term, text]) => <div key={term} className={s.caption}><h3>{term}</h3><p>{text}</p></div>)}</Shell>;
}
