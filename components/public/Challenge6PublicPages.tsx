'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DemoCaseStep } from '@/lib/demo/merchantCaseV1';
import {
  BILLABLE_EVENTS,
  parseRequestedPlanId,
  PLANS,
  PUBLIC_PLAN_IDS,
  TOP_UP_CREDITS,
  TOP_UP_PRICE_GBP,
} from '@/lib/billing/plans';
import { deriveProviderDisplayStage, getIntegrationProvider } from '@/lib/integrations/registry';
import { formatNumber } from '@/lib/utils/format';
import styles from './Challenge6Public.module.css';

const NAV = [
  ['Product', '/landing'],
  ['Pricing', '/pricing'],
  ['Demo', '/demo'],
  ['Help', '/help'],
] as const;

function Mark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? styles.markCompact : styles.mark} aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

export function PublicHeader({ active }: { active?: 'Product' | 'Pricing' | 'Demo' | 'Help' }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/landing" className={styles.brand} aria-label="Unauth home"><Mark /><span>Unauth</span></Link>
        <nav className={styles.navigation} aria-label="Primary">
          {NAV.map(([label, href]) => <Link href={href} aria-current={active === label ? 'page' : undefined} key={label}>{label}</Link>)}
        </nav>
        <span className={styles.headerSpacer} />
        <Link href="/login" className={styles.signIn}>Sign in</Link>
        <Link href="/signup" className={styles.primarySmall}>Create a workspace</Link>
      </div>
    </header>
  );
}

function FullFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <div className={styles.footerBrand}><Mark compact /><span>Unauth</span></div>
          <p>Evidence, decisions, recovery and reconciliation for post-purchase loss. Built for merchants who need to prove a number, not guess it.</p>
        </div>
        <FooterColumn title="Product" links={[["Overview", "/landing"], ["Cases and evidence", "/demo?step=evidence"], ["Recovery", "/demo?step=recovery"], ["Reporting", "/demo?step=decision"]]} />
        <FooterColumn title="Company" links={[["Pricing", "/pricing"], ["Demo", "/demo"], ["Help centre", "/help"], ["Contact", "mailto:hello@unauth.app"]]} />
        <FooterColumn title="Legal" links={[["Privacy approval gate", "/legal/privacy"], ["Data-handling approval gate", "/legal/data-handling"], ["DPA approval gate", "/legal/dpa"], ["Pilot-terms approval gate", "/legal/pilot-terms"]]} />
      </div>
      <div className={styles.companyLine}>Unauth · legal entity and external terms are not approved for external use · figures shown on this site come from a demo workspace and are labelled as such.</div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return <div className={styles.footerColumn}><strong>{title}</strong><nav aria-label={title}>{links.map(([label, href]) => <Link href={href} key={label}>{label}</Link>)}</nav></div>;
}

export function CompactFooter() {
  return (
    <footer className={styles.compactFooter}>
      <div><span>Unauth · external use blocked pending approval</span><span className={styles.headerSpacer} /><Link href="/legal/privacy">Privacy approval gate</Link><Link href="/legal/data-handling">Data handling gate</Link><Link href="/legal/dpa">DPA approval gate</Link><Link href="/legal/pilot-terms">Pilot terms gate</Link></div>
    </footer>
  );
}

function SectionIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <><div className={styles.eyebrow}>{eyebrow}</div><h2 className={styles.sectionTitle}>{title}</h2>{children}</>;
}

const thread = [
  ['Source evidence', 'Read from the provider, with freshness'],
  ['Finding', 'A person interprets ambiguous evidence'],
  ['Recommendation', 'Advisory. Never a decision'],
  ['Merchant decision', 'A named person, a value, a rationale'],
  ['External action', 'What actually happened outside Unauth'],
  ['Recovery', 'Claimed, approved, paid or written off'],
  ['Ledger outcome', 'Append-only, reconciled to source'],
] as const;

const ladder = [
  ['Requested value', '100%', '£258,043.79', '124 records', 'blue'],
  ['Maximum exposure', '99.9%', '£257,774.07', '99.9% of requested', 'blue'],
  ['Prevented', '23.8%', '£61,306.13', '44 records', 'green'],
  ['Confirmed loss', '26.4%', '£68,197.38', '77 ledger entries', 'red'],
  ['Recovered cash', '15.9%', '£41,006.49', '100% of eligible', 'green'],
  ['Observed payout', '0%', '— Unavailable', 'No payment source', 'none'],
  ['Final net loss', '0%', '— Unavailable', '5 records unreconciled', 'none'],
] as const;

const sources = [
  ['SHO', 'shopify', 'Commerce'],
  ['TKT', 'gorgias', 'Support tickets'],
  ['SHP', 'shipbob', 'Fulfilment'],
  ['CAR', 'ups', 'Carrier tracking'],
  ['PAY', 'stripe', 'Payments and disputes'],
  ['IMP', 'csv_import', 'Controlled file import'],
].map(([code, id, kind]) => {
  const provider = getIntegrationProvider(id);
  if (!provider) throw new Error(`Missing public provider: ${id}`);
  return [code, provider.name, kind, deriveProviderDisplayStage(provider)] as const;
});

const boundaries = [
  ['Decide for you', 'Rules and flows recommend, route, request and hold. A refund, a decline or a write-off is always recorded against a named person.'],
  ['Move your money', 'Unauth records what a payment did. Refunds and payouts still happen in Shopify and Stripe.'],
  ['Combine currencies', 'A GBP loss and a USD loss are never added. Every figure carries its currency, range and timezone.'],
  ['Show zero when it means unknown', 'A missing source reads as unavailable, with the source named and the excluded record count stated.'],
  ['Rewrite history', 'The ledger and audit trail are append-only. A reversal or write-off adds a record; nothing is edited away.'],
  ['Read a delivery photograph for you', 'A person records the finding, with a rationale, and another person can disagree with it.'],
] as const;

export function Challenge6Landing() {
  return (
    <div className={styles.page} data-challenge6-surface="landing">
      <PublicHeader active="Product" />
      <main>
        <section className={styles.heroSection}><div className={styles.container}>
          <div className={styles.eyebrow}>Post-purchase loss, evidenced</div>
          <h1 className={styles.heroTitle}>Prove what a refund, a lost parcel or a chargeback actually cost you</h1>
          <p className={styles.heroCopy}>Unauth connects your commerce, support, fulfilment, carrier and payment records, assembles the evidence behind each problem, records the decision a person made, tracks what you recovered, and reconciles all of it back to the source. One traceable thread, from evidence to ledger.</p>
          <div className={styles.heroActions}><Link className={styles.primary} href="/signup">Create a workspace</Link><Link className={styles.secondary} href="/demo">Walk through the demo case</Link><span>No card required · connect Shopify in about four minutes</span></div>
        </div></section>

        <section className={styles.altSection}><div className={styles.container}>
          <SectionIntro eyebrow="The problem" title="The money leaves before anyone can prove why" />
          <div className={styles.threeColumns}>
            <TextBlock title="The evidence lives in five places">An order in Shopify, a claim in a ticket, a scan in a carrier portal, a fee in a warehouse invoice, a dispute in Stripe. Nobody sees them together, so refunds get approved on the loudest story.</TextBlock>
            <TextBlock title="Recoverable money quietly expires">Carrier and warehouse claims have windows and evidence requirements. When they live in spreadsheets and inboxes, deadlines pass and the loss becomes permanent.</TextBlock>
            <TextBlock title="Finance cannot tie the loss to a record">A month-end figure that nobody can trace back to source records is not a number you can defend to an auditor, an insurer or a board.</TextBlock>
          </div>
        </div></section>

        <section className={styles.section}><div className={styles.container}>
          <SectionIntro eyebrow="The thread" title="Seven records, kept distinct on purpose"><p className={styles.introCopy}>Most tools blur these together. Unauth keeps them separate so you can always tell a machine suggestion from a human decision, and a decision from what actually happened.</p></SectionIntro>
          <div className={styles.threadGrid}>{thread.map(([title, copy], index) => <div className={index === 3 ? styles.threadActive : styles.threadCard} key={title}><span>{index + 1}</span><strong>{title}</strong><p>{copy}</p></div>)}</div>
        </div></section>

        <section className={styles.altSection}><div className={styles.container}>
          <SectionIntro eyebrow="A real surface" title="Requested value, traced to final net loss"><p className={styles.introCopy}>This is the reporting ladder as it appears in the product. Every stage is a separately recorded fact, so a stage can be unavailable without invalidating the ones around it.</p></SectionIntro>
          <div className={styles.ladderCard}>
            <div className={styles.ladderHeader}><strong>Financial performance</strong><span>Demo workspace</span><i /><small>1 – 30 Aug 2026 · Europe/London · GBP · 121 cases</small></div>
            <div className={styles.ladderRows}>{ladder.map(([label, width, amount, note, tone]) => <div className={styles.ladderRow} key={label}><span>{label}</span><i><b data-tone={tone} style={{ width }} /></i><strong className={tone === 'none' ? styles.unavailableValue : undefined}>{amount}</strong><small>{note}</small></div>)}</div>
            <p className={styles.ladderNote}>Two stages read as unavailable rather than £0.00. A tool that showed zero there would be lying about the same data.</p>
          </div>
        </div></section>

        <section className={styles.outcomes}><div className={styles.container}>
          <div className={styles.eyebrow}>Outcomes in the demo workspace</div>
          <div className={styles.fourColumns}>
            <Metric value="£61,306.13" title="Prevented">Exposure that never became a payout, across 44 cases</Metric>
            <Metric value="£41,006.49" title="Recovered">Cash received from carriers and warehouses in 31 payments</Metric>
            <Metric value="60%" title="Of confirmed loss was recoverable">Because the agreement terms were on file before the loss happened</Metric>
            <Metric value="4,182" title="Audit events">Every decision attributable to a named person</Metric>
          </div>
          <p className={styles.demoDisclaimer}>These are demo-workspace figures for a single 30-day range, not a claim about your results.</p>
        </div></section>

        <section className={styles.section}><div className={styles.container}>
          <SectionIntro eyebrow="Sources" title="Connect what you already run"><p className={styles.introCopy}>These labels describe implementation maturity, not your merchant connection. Signed-in source pages show configuration, verification and object-family freshness separately.</p></SectionIntro>
          <div className={styles.sourcesGrid}>{sources.map(([code, name, kind, stage]) => <div className={stage === 'planned' ? styles.sourceUnavailable : styles.sourceCard} key={name}><span>{code}</span><div><strong>{name}</strong><small>{kind}</small></div><i /><em>{stage[0].toUpperCase() + stage.slice(1)}</em></div>)}</div>
        </div></section>

        <section className={styles.altSection}><div className={styles.container}>
          <SectionIntro eyebrow="Boundaries" title="What Unauth will never do" />
          <div className={styles.boundaryGrid}>{boundaries.map(([title, copy]) => <div className={styles.boundary} key={title}><span>×</span><div><strong>{title}</strong><p>{copy}</p></div></div>)}</div>
        </div></section>

        <section className={styles.ctaSection}><div className={styles.ctaInner}><div><h2>Start with one source and a real case</h2><p>Connect Shopify, let Unauth index the last thirty days, and open the first case it assembles. You can skip the rest of setup and come back — dependent figures stay unavailable until the sources they need are connected.</p></div><i /><div className={styles.ctaActions}><Link className={styles.primary} href="/signup">Create a workspace</Link><Link className={styles.secondary} href="/pricing">See pricing</Link></div></div></section>
      </main>
      <FullFooter />
    </div>
  );
}

function TextBlock({ title, children }: { title: string; children: ReactNode }) {
  return <div className={styles.textBlock}><strong>{title}</strong><p>{children}</p></div>;
}

function Metric({ value, title, children }: { value: string; title: string; children: ReactNode }) {
  return <div className={styles.metric}><strong>{value}</strong><b>{title}</b><p>{children}</p></div>;
}

const plans = PUBLIC_PLAN_IDS.map((key) => {
  const plan = PLANS[key];
  return {
    key,
    name: plan.name,
    price: plan.priceGbp === 'custom' ? 'Talk to us' : `£${formatNumber(plan.priceGbp)}`,
    suffix: plan.priceGbp === 'custom' ? '' : '/ month',
    description: plan.description,
    allowance: plan.creditsMonthly === 'custom'
      ? 'Credit allowance agreed before activation'
      : `Includes ${formatNumber(plan.creditsMonthly)} credits / month`,
    features: plan.publicFeatures,
    excluded: plan.publicExclusions,
    action: plan.ctaLabel,
    featured: plan.featured,
  };
});

const creditRows = Object.values(BILLABLE_EVENTS).map((event) => [
  event.label,
  String(event.credits),
  event.chargingRule,
] as const);

export function Challenge6Pricing({ requestedPlan }: { requestedPlan?: string }) {
  const selected = parseRequestedPlanId(requestedPlan);
  return (
    <div className={styles.page} data-surface-id="pricing" data-challenge6-surface="pricing">
      <PublicHeader active="Pricing" />
      <main>
        <section className={styles.pricingHero}><div className={styles.container}>
          <div className={styles.eyebrow}>Pricing</div><h1>One monthly plan, with credits for successful bounded work</h1><p>The plan defines seats, stores, entitlements and a monthly credit allowance. A requested plan is saved after account creation, but the active subscription changes only after provider confirmation.</p>
          <div className={styles.billingLine}><div><strong>Monthly billing</strong><span>No annual discount is offered</span></div><small>Prices are in GBP and exclude VAT. Stripe processes Unauth subscription payments; it is not the pilot merchant-payment evidence source.</small></div>
        </div></section>
        <section className={styles.plansSection}><div className={styles.container}><div className={styles.plansGrid}>
          {plans.map((plan) => <article className={plan.featured ? styles.planFeatured : styles.planCard} aria-current={selected === plan.key ? 'true' : undefined} key={plan.key}>
            <div className={styles.planName}><strong>{plan.name}</strong>{plan.featured ? <span>Most chosen</span> : null}</div>
            <div className={styles.planPrice}><strong>{plan.price}</strong><span>{plan.suffix}</span></div><p>{plan.description}</p><hr /><small>{plan.allowance}</small>
            <ul>{plan.features.map((feature) => <li key={feature}><span>✓</span>{feature}</li>)}{plan.excluded.map((feature) => <li className={styles.excluded} key={feature}><span>−</span>{feature}</li>)}</ul>
            <Link className={plan.featured ? styles.primaryPlanAction : styles.secondaryPlanAction} href={`/signup?plan=${plan.key}`}>{plan.action}</Link>
          </article>)}
        </div></div></section>
        <section className={styles.section}><div className={styles.container}>
          <SectionIntro eyebrow="Credits" title="What consumes a credit"><p className={styles.introCopy}>A receipt is written only after a listed operation succeeds. Viewing or filtering an existing record does not consume credits. Raw export is plan-gated and is not promised on every surface.</p></SectionIntro>
          <div className={styles.creditTable}><div className={styles.creditHeader}><span>Action</span><span>Credits</span><span>Charging boundary</span></div>{creditRows.map(([action, credits, note]) => <div className={styles.creditRow} key={action}><span>{action}</span><strong>{credits}</strong><small>{note}</small></div>)}<div className={styles.creditFoot}><span>One top-up: {formatNumber(TOP_UP_CREDITS)} credits for £{formatNumber(TOP_UP_PRICE_GBP)}. Monthly credits reset; purchased top-up credits remain until used.</span><i /><span>Running out pauses credit-backed operations. It does not delete existing records or authorise an external action.</span></div></div>
        </div></section>
        <section className={styles.altSection}><div className={styles.container}><div className={styles.eyebrow}>Limits, stated plainly</div><div className={styles.threeColumns}>
          <TextBlock title="Retention is not release-cleared yet">The pilot retention schedule still needs named owner and counsel approval. No plan is presented here as authority for deleting or retaining a legal or financial record.</TextBlock>
          <TextBlock title="Scheduled report delivery is not available">Reports run on demand and export on demand. There is no saved-report scheduler or email delivery on any plan, and no plan implies one.</TextBlock>
          <TextBlock title="Desktop only for authenticated work">Case review, recovery and reconciliation need a desktop. Below 1024px Unauth shows a boundary rather than a cut-down mobile version.</TextBlock>
        </div></div></section>
        <section className={styles.ctaSection}><div className={styles.ctaInner}><div><h2>Not sure which plan fits?</h2><p>Start with Free to evaluate the supervised workflow, or request Pro for one operating team. No automatic downgrade or retrospective credit is promised.</p></div><i /><Link className={styles.primary} href="/signup?plan=free">Create a workspace</Link></div></section>
      </main>
      <FullFooter />
    </div>
  );
}

const DEMO_STEPS: Array<{ id: DemoCaseStep; label: string }> = [
  { id: 'incoming', label: '1 · Intake' },
  { id: 'evidence', label: '2 · Source evidence' },
  { id: 'recommendation', label: '3 · Recommendation' },
  { id: 'decision', label: '4 · Merchant decision' },
  { id: 'recovery', label: '5 · Recovery' },
];

export function Challenge6ProductDemo({ initialStep = 'incoming' }: { initialStep?: DemoCaseStep }) {
  const [step, setStep] = useState<DemoCaseStep>(initialStep);
  const index = useMemo(() => Math.max(0, DEMO_STEPS.findIndex((item) => item.id === step)), [step]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('step') === step) return;
    params.set('step', step);
    window.history.replaceState(null, '', `/demo?${params.toString()}`);
  }, [step]);
  function move(delta: number) {
    if (index === 4 && delta > 0) return setStep('incoming');
    setStep(DEMO_STEPS[Math.min(4, Math.max(0, index + delta))].id);
  }
  return (
    <div className={styles.page} data-surface-id="interactive-product-demo" data-challenge6-surface="product-demo" data-demo-step={step}>
      <PublicHeader active="Demo" />
      <main>
        <section className={styles.syntheticBanner}><div className={styles.container}><strong>Synthetic demo</strong><span>CASE-4796 is a fabricated case in a demo workspace. No real customer, parcel, payment or partner is involved, and nothing here can be actioned.</span></div></section>
        <section className={styles.demoHero}><div className={styles.container}><div className={styles.eyebrow}>Product demo</div><h1>One lost parcel, from ticket to ledger</h1><p>Five steps, in the order they happen in the product. At each step, what Unauth does is separated from what it deliberately refuses to do.</p><div className={styles.stepNav}>{DEMO_STEPS.map((item) => <button type="button" aria-current={step === item.id ? 'step' : undefined} onClick={() => setStep(item.id)} key={item.id}>{item.label}</button>)}</div><div className={styles.progress}>{DEMO_STEPS.map((item, itemIndex) => <span data-complete={itemIndex <= index} key={item.id} />)}</div></div></section>
        <section className={styles.demoStage}><div className={styles.container}><DemoPanel step={step} /><div className={styles.demoControls}><button className={styles.secondaryButton} disabled={index === 0} onClick={() => move(-1)} type="button">Previous step</button><button className={styles.primaryButton} onClick={() => move(1)} type="button">{index === 4 ? 'Back to the start' : 'Next step'}</button><span /><small>Step {index + 1} of 5</small></div></div></section>
        <section className={styles.demoCta}><div className={styles.container}><div><h2>Run this on your own data</h2><p>Connect Shopify and Unauth will assemble your first real cases from the last thirty days. Figures that need a source you have not connected stay unavailable rather than appearing as zero.</p></div><span /><Link className={styles.primary} href="/signup">Create a workspace</Link></div></section>
      </main>
      <CompactFooter />
    </div>
  );
}

function DemoPanel({ step }: { step: DemoCaseStep }) {
  if (step === 'incoming') return <DemoIntake />;
  if (step === 'evidence') return <DemoEvidence />;
  if (step === 'recommendation') return <DemoRecommendation />;
  if (step === 'decision') return <DemoDecision />;
  return <DemoRecovery />;
}

function DemoShell({ title, subtitle, children, does, doesNot }: { title: string; subtitle: string; children: ReactNode; does: string; doesNot: string }) {
  return <article className={styles.demoPanel}><header><strong>{title}</strong><span>{subtitle}</span></header>{children}<div className={styles.boundaryPair}><div><strong>What Unauth does here</strong><p>{does}</p></div><div><strong>What it does not do</strong><p>{doesNot}</p></div></div></article>;
}

function DemoIntake() {
  const facts = [['Case created', 'CASE-4796', 'From ticket #5521'], ['Cause recorded', 'Delivery loss', 'From ticket classification'], ['Exposure', '£986.00 GBP', 'Order value, not a liability'], ['Status', 'Intake', 'No decision exists yet']];
  return <DemoShell title="A support ticket becomes a case" subtitle="Ticket #5521, received 30 Jul 2026, 08:12 · matched to order #NW-10422" does="Reads the ticket, matches it to a Shopify order and customer, opens a case with the exposure and the cause the ticket implies, and puts it in the queue with an owner." doesNot="It does not judge the claim, score the customer, or move the case towards a refund. Exposure is what could be lost, not what will be paid."><div className={styles.quote}><strong>What the customer said</strong><p>Hi, my order was marked as shipped on 29 July but nothing has arrived and the tracking has not updated in over two weeks. I have checked with neighbours. Can you refund me?</p><small>Dana Whitfield · dana.whitfield@example.com · 14 previous orders</small></div><div className={styles.demoFactGrid}>{facts.map(([label, value, note]) => <div key={label}><small>{label}</small><strong>{value}</strong><span>{note}</span></div>)}</div></DemoShell>;
}

function DemoEvidence() {
  const rows = [['Order #NW-10422', '£986.00 GBP, paid 28 Jul, 3 items', 'Shopify · 4 min ago', 'Current', 'green'], ['Payment ch_3Nf1', '£986.00 captured 28 Jul', 'Stripe · 6 min ago', 'Current', 'green'], ['Ticket #5521', '2 messages, customer claims non-delivery', 'Gorgias · 11 min ago', 'Current', 'green'], ['Shipment RM99201', 'Accepted 29 Jul, no scan since', 'Royal Mail · 41 min ago', 'Gap · 16 days', 'amber'], ['Delivery photograph', 'Not captured on Tracked 48', 'Royal Mail', 'Unavailable', 'grey'], ['Return RET-—', 'No return record exists', 'No returns source', 'No records', 'grey']];
  return <DemoShell title="Source facts, with freshness attached" subtitle="Everything Unauth can prove about this order, and the one thing it cannot" does="Assembles the records from five providers, states how fresh each one is, and names the gap explicitly with the source responsible for it." doesNot="It does not treat a missing photograph as evidence of anything, and it does not fill the carrier gap with an assumption to make the case look complete."><div className={styles.evidenceTable}><div><strong>Record</strong><strong>What it says</strong><strong>Source and freshness</strong><strong>State</strong></div>{rows.map(([record, says, source, state, tone]) => <div key={record}><strong>{record}</strong><span>{says}</span><span>{source}</span><em data-tone={tone}>{state}</em></div>)}</div><p className={styles.evidenceGap}><strong>Evidence gap:</strong> the carrier has recorded nothing for 16 days. Responsibility cannot be settled from what is held, so Unauth suggests asking the carrier rather than guessing.</p></DemoShell>;
}

function DemoRecommendation() {
  return <DemoShell title="An advisory recommendation" subtitle="Payout rule v4 · matched on cause, exposure and evidence age" does="Applies the published rule, shows exactly which conditions matched, and lays out the counter-arguments from the same evidence." doesNot="It does not record a decision, notify the customer, write to the ledger, or let the rule act while nobody is looking."><p className={styles.recommendation}><strong>Recommended: refund in full, £986.00 GBP.</strong> This is advice from a rule a person wrote and published. It is not a decision, it does not appear in the ledger, and choosing something else is not an override error.</p><div className={styles.demoColumns}><DemoList title="Why the rule matched" tone="blue" rows={[["Cause is delivery loss", "Recorded from the ticket"], ["Carrier scan older than 14 days", "16 days, from Royal Mail"], ["Exposure under the £5,000 approval limit", "£986.00"], ["Customer has no prior refunded claim", "14 orders, 0 refunds"]]} /><DemoList title="Reasons a person might disagree" tone="amber" rows={[["The evidence gap is still open", "Asking the carrier first may recover more"], ["Two prior non-deliveries this quarter", "Recorded on the customer, not a verdict"], ["Replacement may cost less than a refund", "£412.00 cost of goods"]]} /></div></DemoShell>;
}

function DemoDecision() {
  return <DemoShell title="A person decides, and the ledger records it" subtitle="Recorded by Rosa Carrick · 14 Aug 2026, 09:04" does="Records who decided what, for how much, and why; then reconciles the real Stripe payment against the decision and writes the loss once, append-only." doesNot="It does not issue the refund itself, and it never lets the recommendation stand in as the decision. Reversing this later adds a record instead of editing it."><div className={styles.demoColumns}><DemoDefinition title="The decision" rows={[["Outcome", "Refund in full"], ["Value", "£986.00 GBP"], ["Decided by", "Rosa Carrick · operations lead"], ["Permission", "Record decisions up to £5,000"], ["Rationale", "No carrier scan for 16 days; customer testimony accepted."], ["Record", "DEC-1194"]]} /><DemoList title="What followed, in order" tone="green" rows={[["DEC-1194 appended to the case", "14 Aug, 09:04 · by a person"], ["Refund issued in Shopify", "14 Aug, 09:11 · outside Unauth"], ["Stripe recorded re_3Nf1", "14 Aug, 09:12 · £986.00 left the account"], ["LDG-40118 confirmed loss", "14 Aug, 09:12 · append-only"]]} /></div></DemoShell>;
}

function DemoRecovery() {
  return <DemoShell title="Responsibility, then recovery" subtitle="Assessed 15 Aug · claim opened the same day" does="Separates the customer outcome from the financial question, opens a claim bounded by the confirmed loss, tracks the deadline and states what evidence is still missing." doesNot="It does not file the claim automatically, assume approval, or count the sought amount as recovered. Writing off the balance would be an explicit, irreversible act."><div className={styles.demoColumns}><DemoDefinition title="Who bears the loss" rows={[["Responsible", "Carrier · Royal Mail"], ["Confidence", "Medium"], ["Recoverable", "Up to £986.00 GBP"], ["Agreement", "Carrier terms v3 · cap £1,500.00"], ["Deadline", "12 Sep 2026 · 90-day window"]]} foot="The customer was already refunded. This is the separate question of who should ultimately absorb the cost." /><DemoDefinition title="Recovery REC-8842" rows={[["Sought", "£986.00 GBP"], ["Approved", "— Unavailable"], ["Recovered", "£0.00"], ["Outstanding", "£986.00 GBP"]]} foot="Submitted 15 Aug with 3 of 4 evidence items. The customer statement is still outstanding; the delivery photograph never existed." /></div><p className={styles.reportingNote}><strong>Where this case ends up in reporting:</strong> £986.00 confirmed loss, £986.00 eligible recovery, £0.00 recovered so far, and a final net loss that stays unavailable until the claim resolves and reconciles. Nothing is netted off early to make the number look finished.</p></DemoShell>;
}

function DemoList({ title, rows, tone }: { title: string; rows: string[][]; tone: string }) {
  return <div className={styles.demoBox}><strong>{title}</strong>{rows.map(([label, detail]) => <div className={styles.demoListRow} key={label}><i data-tone={tone} /><span><b>{label}</b><small>{detail}</small></span></div>)}</div>;
}

function DemoDefinition({ title, rows, foot }: { title: string; rows: string[][]; foot?: string }) {
  return <div className={styles.demoBox}><strong>{title}</strong><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{foot ? <p>{foot}</p> : null}</div>;
}
