'use client';

import { GateArtifactsRow } from '@/components/EvidenceNotVerdictsRampSection';
import { PanelCard } from '@/components/ui';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';
import foundationStyles from './foundation/foundation.module.css';

const recoveryCards = [
  {
    title: 'The carrier lost it → bill the carrier.',
    body:
      "Parcel lost in transit. No delivery scan. Exception on the route. That is the carrier's liability, not yours. Unauth flags it the moment the claim comes in, calculates the claim window before it closes, and assembles the evidence packet ready to file. The losses you have been quietly eating become money you go and collect.",
  },
  {
    title: 'The warehouse shipped it wrong → bill the 3PL.',
    body:
      'Wrong item, short shipment, mismatch against what the order actually said. Unauth catches the discrepancy against your fulfilment records and documents it against the responsible party — so the refund you gave the customer becomes a recoverable case against whoever caused the error, not a loss you absorb silently.',
  },
  {
    title: 'The same customer keeps claiming → you finally see the pattern.',
    body:
      "One customer filed item not received in January, March, and twice in May. To the agent picking up today's ticket, it looks like a first-time problem. They have no idea this is the fifth claim this quarter. Unauth puts that history in front of them before any refund goes out — how many claims, how recent, how many already paid. The serial claimant that no single agent could ever see becomes visible at the one moment it matters. The pattern stops. The money stays.",
  },
  {
    title: 'Your own team is leaking it → see exactly where.',
    body:
      'An agent refunds outside policy. A goodwill exception quietly becomes the norm. One shift is tighter than another. Unauth surfaces every override — which agent, which claim, which rule they bypassed — so you can see, for the first time, how much your own process is costing you and exactly where it breaks down.',
  },
] as const;

const monthlyRows = [
  {
    label: 'Carrier fault',
    value: '£6,200',
    meta: 'Recoverable — 2 claim windows closing this week',
  },
  {
    label: '3PL / warehouse fault',
    value: '£3,100',
    meta: 'Recoverable — evidence documented',
  },
  {
    label: 'Customer claims',
    value: '£1,800',
    meta: 'Reviewed — held where pattern was flagged',
  },
  {
    label: 'Policy overrides',
    value: '£2,900',
    meta: '5 agents — surfaced for review',
  },
] as const;

const problemRows = [
  {
    title: 'Decided from memory, not policy.',
    body:
      'Your refund rules live in a training document and a Slack thread from eight months ago. They are not in front of the person — or the AI agent — resolving the claim right now. So the decision gets made on instinct, the policy leaks, and no one ever knows it happened.',
  },
  {
    title: 'Resolved before the evidence was checked.',
    body:
      "The ticket closed before anyone looked at the delivery scan, the order value, or the fact that this customer filed the same claim in February. The refund went through because the customer was persistent. The carrier's claim window was open for another three weeks. No one filed it.",
  },
  {
    title: 'Nothing to point to when it matters.',
    body:
      'A chargeback lands six weeks later. You cannot reconstruct what your team saw, which rule applied, or why money moved. You answer the dispute with nothing. The loss gets written off twice — once when you refunded, once when you lose the chargeback.',
  },
] as const;

const gateSteps = [
  {
    id: '01',
    title: 'A claim arrives in your helpdesk, exactly as it does today.',
    body: '',
    tag: undefined,
  },
  {
    id: '02',
    title: 'The gate checks it.',
    body:
      "Delivery proof, order value, this customer's full claim history with you, whether a carrier or warehouse recovery route is available, which of your rules apply.",
    tag: undefined,
  },
  {
    id: '03',
    title: 'Safe claims pass straight through.',
    body:
      'First-time customer, low value, clean delivery? Cleared instantly. Your team and your AI handle it at full speed. Nothing slows down that should not.',
    tag: 'Cleared',
  },
  {
    id: '04',
    title: 'Risky claims are held.',
    body:
      'Your AI agent is stopped from auto-refunding. The claim is routed to a human with the order, the delivery evidence, the customer\'s prior claim history, the exact rule that fired, who owns the loss, and the recovery case already assembled — in one screen, before anyone replies.',
    tag: 'Held',
  },
  {
    id: '05',
    title: 'The outcome is recorded.',
    body:
      'Decision, evidence, loss owner, and recovery route documented permanently. Your ledger grows. Your chargeback defence is built. The pattern becomes visible.',
    tag: 'Logged',
  },
] as const;

const gateExamples = [
  {
    title: 'Lost in transit',
    detail: 'No delivery scan, carrier exception flagged',
    result: 'Held. Carrier owes this. Claim assembled — window closes in 6 days.',
  },
  {
    title: 'Wrong item received',
    detail: 'Order said SKU-A, warehouse shipped SKU-B',
    result: 'Held. 3PL fault documented. Recovery case ready.',
  },
  {
    title: 'Item not received',
    detail: 'No delivery scan, first claim, low order value',
    result: 'Cleared. Safe to auto-resolve.',
  },
  {
    title: 'Item not received',
    detail: 'Delivered with signature, 4th claim this quarter',
    result: 'Held. Full claim history surfaced. Human review before any refund.',
  },
] as const;

const principles = [
  {
    title: 'Your rules, not our model.',
    body:
      'Every hold traces to a rule you set and conditions you can read. No risk score, no black box, no judgement Unauth makes on your behalf.',
  },
  {
    title: 'Evidence, never a verdict.',
    body:
      "Unauth shows what is known, what is missing, and what it cannot determine. It names the pattern. It never labels a customer.",
  },
  {
    title: 'Nothing resolved blindly.',
    body:
      'No held claim closes — human or AI — without a person seeing the evidence first. Every decision has a record.',
  },
  {
    title: 'Every loss has an owner.',
    body:
      'Carrier, warehouse, customer, or a policy override — attributed on every claim, so the money is traceable, the recovery is actionable, and nothing gets written off because no one knew whose fault it was.',
  },
] as const;

const comparisonRows = [
  {
    capability: 'Recovery routing',
    without: 'Loss absorbed — no one identifies or files a recovery',
    with: 'Carrier and 3PL losses flagged with deadline and evidence ready',
  },
  {
    capability: 'Customer claim history',
    without: "Invisible to the agent handling today's ticket",
    with: 'Full prior claim pattern surfaced before any refund goes out',
  },
  {
    capability: 'Rules at the moment of decision',
    without: 'Applied from memory, if remembered at all',
    with: 'Evaluated against every claim before action is taken',
  },
  {
    capability: 'AI auto-resolution control',
    without: 'Closes claims to hit a rate, blind to recovery opportunities',
    with: 'Stopped on risky and recoverable claims — cleared on safe ones',
  },
  {
    capability: 'Loss attribution',
    without: 'Refunded and written off with no cause recorded',
    with: 'Carrier, warehouse, customer, or override — on every claim',
  },
  {
    capability: 'Chargeback evidence',
    without: 'Reconstructed under a 72-hour deadline',
    with: 'Already assembled at the moment the decision was made',
  },
  {
    capability: 'Consistent outcomes',
    without: 'Depends on the agent, the shift, and their memory',
    with: 'Same rule, same claim type, same decision — every time',
  },
] as const;

export default function OutcomeLandingBody() {
  return (
    <>
      <AhaStrip />
      <MonthlyViewSection />
      <ProblemSection />
      <CustomerHistorySection />
      <PrinciplesSection />
    </>
  );
}

export function ClaimGateHero() {
  return (
    <section className="border-b border-[var(--border-subtle)] bg-white pb-[140px]" data-nav-theme="light">
      <div className={foundationStyles.hero2Layout}>
        <div className={foundationStyles.hero2Copy}>
          <Reveal>
            <h2 className={foundationStyles.hero2Headline} style={{ maxWidth: 760 }}>
              Sits between the AI decision
              <br />
              and the payout. Every time.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className={`${foundationStyles.heroSubtitle} ${foundationStyles.hero2Subtitle}`}>
              The gate runs on every claim. Your team only sees what needs them.
            </p>
          </Reveal>
        </div>

        <Reveal delay={180}>
          <GateArtifactsRow scale={0.9} align="content" />
        </Reveal>
      </div>
    </section>
  );
}

export function AhaStrip() {
  return (
    <section className="border-t border-[var(--border-subtle)] bg-[var(--ink-primary)] text-white" data-nav-theme="dark">
      <div className="mx-auto w-full max-w-[70rem] px-5 py-12 sm:px-8 md:py-14">
        <Reveal>
          <p className="font-mono text-[0.82rem] uppercase tracking-[0.14em] text-white/66">
            Last month you refunded £14,000 in claims.
          </p>
        </Reveal>
        <div className="mt-6 space-y-3">
          {[
            '£6,200 was carrier fault — recoverable.',
            '£3,100 was your warehouse shipping the wrong items — recoverable.',
            '£1,800 went to customers who had already claimed three, four, five times this quarter — money your team had no way to see coming.',
            '£2,900 left because agents refunded outside your own rules.',
          ].map((line, index) => (
            <Reveal key={line} delay={index * 70}>
              <p className="max-w-[62rem] text-[1rem] leading-relaxed text-white/92 md:text-[1.08rem]">
                {line}
              </p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={320}>
          <p className="mt-7 max-w-[62rem] text-[1rem] leading-relaxed text-white/80 md:text-[1.08rem]">
            You didn&apos;t see any of that breakdown. You just saw £14,000 in refunds. Unauth shows you where every pound went — and builds the case to claw back every recoverable one.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function RecoverySection() {
  return (
    <section id="what-you-recover" className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28" data-nav-theme="light">
      <Reveal>
        <SectionHeader
          eyebrow="Where the money comes back from"
          headline="You&apos;ve been absorbing losses that belong to someone else."
        />
      </Reveal>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {recoveryCards.map((item, index) => (
          <Reveal key={item.title} delay={index * 70}>
            <PanelCard as="article" variant="surface" className="md:px-6 md:py-6">
              <h3 className="text-[1rem] font-semibold leading-snug text-[var(--ink-primary)]">{item.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-[var(--ink-secondary)]">{item.body}</p>
            </PanelCard>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function MonthlyViewSection() {
  return (
    <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-overlay)]" data-nav-theme="light">
      <div className="mx-auto grid w-full max-w-[70rem] gap-10 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeader
              eyebrow="What your finance team finally sees"
              headline="Not &quot;£14,000 in refunds.&quot; A map of where every pound went — and which ones you can get back."
              body="Today, post-purchase loss is a single number with no breakdown. You know you refunded a lot. You do not know how much of it was someone else's fault, how much was preventable, how much is still recoverable before a deadline closes. Unauth turns it into a ledger. Every claim attributed to a cause. Every recoverable loss flagged with the deadline to file. Every override surfaced against the agent who made it. For the first time you can answer the question your CFO actually asks — not &quot;how much did we refund,&quot; but &quot;how much of it should we have, and where is the rest going?&quot;"
            />
          </Reveal>
        </div>
        <Reveal delay={120}>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-white p-5 shadow-[0_20px_60px_rgba(17,17,17,0.06)]">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              Monthly view
            </p>
            <div className="mt-5 divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
              {monthlyRows.map((row) => (
                <div key={row.label} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-primary)]">{row.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--ink-secondary)]">{row.meta}</p>
                  </div>
                  <p className="text-[1.1rem] font-semibold tracking-[-0.03em] text-[var(--ink-primary)]">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function ProblemSection() {
  return (
    <section className="border-y border-white/10 bg-[var(--ink-primary)] text-white" data-nav-theme="dark">
      <div className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-24">
        <Reveal>
          <SectionHeader
            eyebrow="Where losses actually come from"
            headline="The same claim, handled by two agents, produces two different outcomes. Neither one is written down. Neither loss is ever recovered."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {problemRows.map((item, index) => (
            <Reveal key={item.title} delay={index * 80}>
              <PanelCard as="article" variant="dark" className="h-full backdrop-blur-[2px]">
                <h3 className="text-[1rem] font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-white/78">{item.body}</p>
              </PanelCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CustomerHistorySection() {
  return (
    <section className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28" data-nav-theme="light">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeader
              eyebrow="Customer history"
              headline="The moment that changes the outcome is the moment the pattern becomes visible."
              body="One customer filed item not received in January, March, and twice in May. To the agent opening today's ticket, it looks like a first-time complaint. Unauth surfaces the full claim history with you before any refund goes out — how many claims, how recent, and how many already paid."
            />
          </Reveal>
        </div>
        <Reveal delay={120}>
          <PanelCard variant="surface" className="p-5">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              Claim history on the ticket
            </p>
            <div className="mt-5 divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
              {[
                ['January', 'Item not received', 'Refund paid'],
                ['March', 'Item not received', 'Refund paid'],
                ['May', 'Item not received', 'Refund paid'],
                ['May', 'Item not received', 'Refund paid'],
                ['Today', 'Item not received', 'Held before refund'],
              ].map(([month, issue, outcome]) => (
                <div key={`${month}-${outcome}`} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-4 py-4">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">{month}</p>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-primary)]">{issue}</p>
                    <p className="mt-1 text-sm text-[var(--ink-secondary)]">{outcome}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-[var(--ink-secondary)]">
              The serial claimant that no single agent could ever see becomes visible at the one moment it matters. The pattern stops. The money stays.
            </p>
          </PanelCard>
        </Reveal>
      </div>
    </section>
  );
}

function GateSection() {
  return (
    <section id="how-it-works" className="border-y border-[var(--border-subtle)] bg-[var(--surface-overlay)]" data-nav-theme="light">
      <div className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28">
        <Reveal>
          <SectionHeader
            eyebrow="How it works"
            headline="None of this is possible after the fact. It only works if you catch the claim before it&apos;s paid."
            body="You cannot recover a loss you have already refunded and forgotten. The evidence goes stale. The carrier's claim window closes. The pattern stays invisible. That is why Unauth is a gate — it stops every risky claim before the refund goes out, while the evidence is fresh, the window is open, and the money is still yours to keep or recover."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {gateSteps.map((step, index) => (
            <Reveal key={step.id} delay={index * 70}>
              <PanelCard as="article" variant="surface" className="h-full">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-[var(--ink-tertiary)]">{step.id}</p>
                  {step.tag ? (
                    <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                      {step.tag}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-[1rem] font-semibold leading-snug text-[var(--ink-primary)]">
                  {step.title}
                </h3>
                {step.body ? (
                  <p className="mt-3 text-sm leading-relaxed text-[var(--ink-secondary)]">{step.body}</p>
                ) : null}
              </PanelCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiBridgeSection() {
  return (
    <section className="border-y border-[var(--border-subtle)] bg-white" data-nav-theme="light">
      <div className="mx-auto grid w-full max-w-[70rem] gap-12 px-5 py-20 sm:px-8 md:py-28 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
        <div>
          <Reveal>
            <SectionHeader
              eyebrow="Built for where support is going"
              headline="The faster your AI resolves claims, the faster unrecovered money disappears."
              body="Yuma, Siena, and Gorgias AI are built to close tickets fast. Not to stop and ask whether a £400 item-not-received claim from a repeat claimant should be auto-refunded — or whether the loss should be billed to the carrier instead. Every fast auto-refund on a carrier-lost parcel is money you will never claw back, because no one ever flagged whose fault it was. Unauth sits in front of the resolution. Turn your automation all the way up. The gate still catches the claims worth recovering and the ones that should never have been paid. You do not choose between speed and control. The gate is what lets you have both."
            />
          </Reveal>
        </div>
        <Reveal delay={120}>
          <PanelCard variant="surface" className="p-5">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
              Gate routing — live
            </p>
            <div className="mt-5 space-y-4">
              {gateExamples.map((example) => (
                <div key={example.title + example.detail} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] px-4 py-4">
                  <p className="text-sm font-semibold text-[var(--ink-primary)]">{example.title}</p>
                  <p className="mt-1 text-sm text-[var(--ink-secondary)]">{example.detail}</p>
                  <p className="mt-3 font-medium text-[var(--ink-primary)]">{example.result}</p>
                </div>
              ))}
            </div>
          </PanelCard>
        </Reveal>
      </div>
    </section>
  );
}

export function PrinciplesSection() {
  return (
    <section className="border-y border-white/10 bg-[var(--ink-primary)]" data-nav-theme="dark">
      <div className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-24">
        <Reveal>
          <SectionHeader eyebrow="How the gate behaves" headline="The rules that keep every claim explainable." />
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {principles.map((principle, index) => (
            <Reveal key={principle.title} delay={index * 70}>
              <PanelCard as="article" variant="dark">
                <h3 className="text-[1rem] font-semibold text-white">{principle.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/78">{principle.body}</p>
              </PanelCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ComparisonSection() {
  return (
    <section className="mx-auto w-full max-w-[70rem] px-5 py-20 sm:px-8 md:py-28" data-nav-theme="light">
      <Reveal>
        <SectionHeader
          eyebrow="Why claim control, not another inbox tool"
          headline="What your support stack is missing right now."
        />
      </Reveal>
      <Reveal delay={80}>
        <div className="mt-12 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-white">
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-[var(--border-default)] bg-[var(--surface-overlay)] px-5 py-4">
            <p className="text-sm font-semibold text-[var(--ink-primary)]">Capability</p>
            <p className="text-sm font-semibold text-[var(--ink-primary)]">Without Unauth</p>
            <p className="text-sm font-semibold text-[var(--ink-primary)]">With Unauth</p>
          </div>
          {comparisonRows.map((row) => (
            <div
              key={row.capability}
              className="grid grid-cols-1 gap-3 border-b border-[var(--border-default)] px-5 py-4 last:border-b-0 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4"
            >
              <p className="text-sm font-semibold text-[var(--ink-primary)]">{row.capability}</p>
              <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">{row.without}</p>
              <p className="text-sm leading-relaxed text-[var(--ink-primary)]">{row.with}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
