import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  PackageCheck,
} from 'lucide-react';
import {
  FL_CATEGORY_COMPARISON,
  FL_CLAIM_DECISION_LOOP,
  FL_DEMO_PRODUCT_CARDS,
  FL_ROUTES,
} from '@/app/(public)/landing/_lib/foundationContent';
import MobileCollapse from '@/app/(public)/landing/_components/foundation/MobileCollapse';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

const demo = FL_DEMO_PRODUCT_CARDS;

export default function EvidenceNotVerdictsRampSection() {
  return (
    <section
      id="claim-decision"
      className="relative min-h-screen scroll-mt-24 overflow-hidden bg-white text-[#111111] border-t border-black/[0.07]"
      data-nav-theme="light"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_24%,rgba(0,0,0,0.055),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white to-transparent" />

      <main className="relative mx-auto hidden max-w-[1180px] px-6 pb-24 pt-20 md:pt-24 min-[769px]:block">
        <SectionIntro />
        <ClaimDecisionLoopStrip />
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-[24px]">
          <RecommendationCard />
          <EvidenceCard />
          <AuditCard />
        </div>
        <CategoryComparison />
      </main>

      <main className="relative px-4 pb-20 pt-16 min-[769px]:hidden">
        <MobileCollapse collapsedLabel="See the claim decision workflow">
          <SectionIntro />
          <div className="mt-8">
            <ClaimDecisionLoopStrip />
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5">
            <RecommendationCard />
            <EvidenceCard />
            <AuditCard />
          </div>
          <div className={foundationStyles.collapseDetails}>
            <div className={foundationStyles.collapseDetailsInner}>
              <CategoryComparison />
            </div>
          </div>
        </MobileCollapse>
      </main>
    </section>
  );
}

function SectionIntro() {
  return (
    <div className="mb-10 max-w-[760px]">
      <p className={foundationStyles.landingSectionEyebrow}>{FL_CLAIM_DECISION_LOOP.eyebrow}</p>
      <h2 className={foundationStyles.landingSectionTitle}>{FL_CLAIM_DECISION_LOOP.headline}</h2>
      <p className={`${foundationStyles.landingSectionLead} max-w-[700px]`}>
        {FL_CLAIM_DECISION_LOOP.subhead}
      </p>
    </div>
  );
}

function ClaimDecisionLoopStrip() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {FL_CLAIM_DECISION_LOOP.steps.map((step) => (
        <article
          key={step.number}
          className="rounded-xl border border-[#e5e5e5] bg-[#fafaf9] px-4 py-4"
        >
          <div className="font-mono text-[12px] font-semibold tracking-[-0.02em] text-black/40">
            {step.number}
          </div>
          <h3 className="mt-2 text-[15px] font-semibold tracking-[-0.04em] text-[#111111]">
            {step.title}
          </h3>
          <p className="mt-2 text-[13px] leading-[1.45] tracking-[-0.015em] text-[#555555]">
            {step.body}
          </p>
        </article>
      ))}
    </div>
  );
}

function FeatureCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="flex min-h-[620px] flex-col rounded-[16px] border border-[#dedede] bg-[#f4f3f1] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
      <div className="flex items-start justify-between gap-3">
        <NumberBadge>{number}</NumberBadge>
        <OpenButton />
      </div>
      <h2 className="mt-5 max-w-[280px] text-[26px] font-semibold leading-[1.08] tracking-[-0.06em] text-[#111111]">
        {title}
      </h2>
      <div className="mt-auto flex justify-center pt-14">
        <MockPanel>{children}</MockPanel>
      </div>
    </article>
  );
}

function RecommendationCard() {
  return (
    <FeatureCard number="03" title="Explainable recommendation">
      <div className="mb-3 inline-flex rounded-full bg-[#fff4d6] px-2.5 py-1 text-[12px] font-semibold tracking-[-0.03em] text-[#8a6a00]">
        {demo.recommendation.label}
      </div>
      <p className="mb-3 text-[13px] font-semibold tracking-[-0.03em]">
        Rule: {demo.recommendation.rule}
      </p>
      <p className="mb-2 text-[12px] font-semibold text-[#666666]">Why this matched:</p>
      <ul className="space-y-2">
        {demo.recommendation.conditions.map((line) => (
          <li key={line} className="flex gap-2 text-[12px] leading-[1.35] text-[#444444]">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#4d8d3d]" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-[1.4] text-[#777777]">
        Unauth applies your rules. Your team makes the final decision.
      </p>
    </FeatureCard>
  );
}

function EvidenceCard() {
  return (
    <FeatureCard number="02" title="Claim context assembled">
      <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.04em]">Delivery &amp; order evidence</h3>
      <div className="space-y-2">
        {demo.evidence.items.map((item) => (
          <ContextRow key={item} icon={<PackageCheck size={14} />} label={item} />
        ))}
      </div>
      <div className="mt-3.5 rounded-lg border border-[#e9e5dd] bg-[#fbfaf5] px-3.5 py-3 text-[12px] font-semibold tracking-[-0.025em]">
        Example: item-not-received with connected delivery proof.
      </div>
    </FeatureCard>
  );
}

function AuditCard() {
  return (
    <FeatureCard number="05" title="Decision audit trail">
      <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.04em]">Queryable recommendation record</h3>
      <div className="space-y-2">
        {demo.audit.items.map((item) => (
          <ContextRow key={item} icon={<ClipboardList size={14} />} label={item} />
        ))}
      </div>
      <div className="mt-3.5 rounded-lg border border-[#ececec] bg-white px-3.5 py-3 text-[12px] leading-[1.35] text-[#555555]">
        Every meaningful evaluation is stored with claim id, ticket id, rule match, and signal snapshot.
      </div>
    </FeatureCard>
  );
}

function CategoryComparison() {
  return (
    <section className="mt-10 rounded-xl border border-[#dedede] bg-[#f5f4f1] px-6 py-8">
      <p className={foundationStyles.landingSectionEyebrow}>{FL_CATEGORY_COMPARISON.eyebrow}</p>
      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
        <ComparisonColumn
          title={FL_CATEGORY_COMPARISON.traditional.title}
          items={FL_CATEGORY_COMPARISON.traditional.items}
          muted
        />
        <ComparisonColumn title={FL_CATEGORY_COMPARISON.unauth.title} items={FL_CATEGORY_COMPARISON.unauth.items} />
      </div>
      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link
          href={FL_ROUTES.audit}
          prefetch={false}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#111111] px-5 text-[14px] font-semibold text-white"
        >
          Connect store and helpdesk
          <ArrowRight size={15} />
        </Link>
        <p className="text-[13px] leading-[1.45] text-[#555555]">
          Single-store value starts with your own claim history — network intelligence is an expansion layer.
        </p>
      </div>
    </section>
  );
}

function ComparisonColumn({
  title,
  items,
  muted = false,
}: {
  title: string;
  items: readonly string[];
  muted?: boolean;
}) {
  return (
    <div>
      <h3
        className={`text-[18px] font-semibold tracking-[-0.04em] ${
          muted ? 'text-black/45' : 'text-[#111111]'
        }`}
      >
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className={`flex gap-2.5 text-[14px] leading-[1.45] ${
              muted ? 'text-black/50' : 'text-[#333333]'
            }`}
          >
            <span className="mt-2 h-px w-3 shrink-0 bg-current opacity-40" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MockPanel({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[300px] rounded-[16px] border border-[#e7e7e7] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.14)]">
      <BrowserDots />
      <div className="px-4 pb-5 pt-4">{children}</div>
    </div>
  );
}

function NumberBadge({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex h-[24px] min-w-[27px] items-center justify-center rounded-md border border-[#dedede] bg-white px-1.5 text-[13px] font-semibold tracking-[-0.03em] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      {children}
    </div>
  );
}

function OpenButton() {
  return (
    <button
      type="button"
      aria-label="Open preview"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e3e3e3] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.05)]"
    >
      <ExternalLink size={18} />
    </button>
  );
}

function BrowserDots() {
  return (
    <div className="flex h-[40px] items-center gap-2 border-b border-[#ededed] px-4">
      <span className="h-2.5 w-2.5 rounded-full bg-[#d9d9d9]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#d9d9d9]" />
      <span className="h-2.5 w-2.5 rounded-full bg-[#d9d9d9]" />
    </div>
  );
}

function ContextRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-[36px] items-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-3 py-2">
      <span className="shrink-0 text-[#666666]">{icon}</span>
      <span className="text-[12px] font-medium leading-[1.2] tracking-[-0.025em] text-[#333333]">
        {label}
      </span>
    </div>
  );
}
