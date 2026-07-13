'use client';

import { GateArtifactsRow } from '@/components/EvidenceNotVerdictsRampSection';
import { PanelCard } from '@/components/ui';
import Reveal from './Reveal';
import SectionHeader from './SectionHeader';
import foundationStyles from './foundation/foundation.module.css';

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
