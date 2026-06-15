import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ExternalLink,
  FolderOpen,
  PackageCheck,
  ShieldCheck,
  Store,
  UsersRound,
  Workflow,
} from 'lucide-react';
import { FL_ROUTES } from '@/app/(public)/landing/_lib/foundationContent';
import MobileCollapse from '@/app/(public)/landing/_components/foundation/MobileCollapse';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

export default function EvidenceNotVerdictsRampSection() {
  return (
    <section
      id="how-it-works"
      className="relative min-h-screen scroll-mt-24 overflow-hidden bg-white text-[#111111] border-t border-black/[0.07]"
      data-nav-theme="light"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_24%,rgba(0,0,0,0.055),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white to-transparent" />

      {/* Desktop / tablet-landscape (≥769px) — original layout, untouched */}
      <main className="relative mx-auto hidden max-w-[1180px] px-6 pb-24 pt-20 md:pt-24 min-[769px]:block">
        <div className="mb-10 max-w-[720px]">
          <p className={foundationStyles.landingSectionEyebrow}>
            How it works
          </p>
          <h2 className={foundationStyles.landingSectionTitle}>
            Context attached before every reply.
          </h2>
          <p className={`${foundationStyles.landingSectionLead} max-w-[660px]`}>
            Unauth connects to your store and helpdesk, surfaces cross-merchant claim history,
            and attaches graded evidence to every ticket — automatically. No workflow changes
            required.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-[24px]">
          <FeatureCardOne />
          <FeatureCardTwo />
          <FeatureCardThree />
        </div>
        <BottomStrip />
      </main>

      {/* Mobile (≤768px) — Stripe-style collapse */}
      <main className="relative px-4 pb-20 pt-16 min-[769px]:hidden">
        <MobileCollapse collapsedLabel="See how context is attached">
          <p className={foundationStyles.landingSectionEyebrow}>How it works</p>
          <h2 className={`${foundationStyles.landingSectionTitle} mt-3 pr-14`}>
            Context attached before every reply.
          </h2>

          <div className="mt-8 grid grid-cols-1 gap-5">
            <FeatureCardOne />
            <FeatureCardTwo />
            <FeatureCardThree />
          </div>

          <div className={foundationStyles.collapseDetails}>
            <div className={foundationStyles.collapseDetailsInner}>
              <p className={foundationStyles.landingSectionLead}>
                Unauth connects to your store and helpdesk, surfaces cross-merchant claim history,
                and attaches graded evidence to every ticket — automatically. No workflow changes
                required.
              </p>
              <div className="mt-6">
                <BottomStrip />
              </div>
            </div>
          </div>
        </MobileCollapse>
      </main>
    </section>
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

function MockPanel({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[300px] rounded-[16px] border border-[#e7e7e7] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.14)]">
      <BrowserDots />
      <div className="px-4 pb-5 pt-4">{children}</div>
    </div>
  );
}

function FeatureCardOne() {
  return (
    <FeatureCard number="01" title="Zero automated decisions, by design">
      <div className="mb-5 flex items-center gap-2.5">
        <IconBox small>
          <ShieldCheck size={15} />
        </IconBox>
        <div className="text-[16px] font-semibold leading-[1.1] tracking-[-0.04em]">
          Decisions stay with your team
        </div>
      </div>

      <div className="space-y-3.5 text-[13px] leading-[1.2] text-[#555555]">
        <DecisionLine>No automated approvals</DecisionLine>
        <DecisionLine>No automated denials</DecisionLine>
        <DecisionLine>No refund automation</DecisionLine>
        <DecisionLine>No black-box verdicts</DecisionLine>
      </div>

      <div className="mt-5 rounded-lg border border-[#e4e4e4] bg-[#fafafa] p-3.5">
        <div className="flex items-center gap-3">
          <IconBox small>
            <UsersRound size={15} />
          </IconBox>
          <div className="text-[13px] font-semibold leading-[1.25] tracking-[-0.03em]">
            Your team reviews.
            <br />
            You make the call.
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function FeatureCardTwo() {
  return (
    <FeatureCard number="02" title="Every claim arrives with context">
      <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.04em]">Claim context attached</h3>
      <div className="space-y-2">
        <ContextRow icon={<PackageCheck size={14} />} label="Customer claim" value="“Never arrived”" />
        <ContextRow icon={<Store size={14} />} label="Order & delivery" value="Delivered · 7/21/25" />
        <ContextRow icon={<UsersRound size={14} />} label="Customer history" value="4 orders · 2 refunds" />
        <ContextRow icon={<Workflow size={14} />} label="Cross-merchant signals" badge="3 matches" />
        <ContextRow icon={<ShieldCheck size={14} />} label="Evidence grade" badge="High" green />
      </div>
      <div className="mt-3.5 rounded-lg border border-[#e9e5dd] bg-[#fbfaf5] px-3.5 py-3 text-[12px] font-semibold tracking-[-0.025em]">
        Full context. Ready for your review.
      </div>
    </FeatureCard>
  );
}

function FeatureCardThree() {
  return (
    <FeatureCard number="03" title="Repeated patterns, matched across every merchant">
      <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.04em]">Cross-merchant matches</h3>
      <div className="space-y-2">
        <MerchantMatch merchant="Merchant A" detail="Claim · 6/18/25" status="Matched" />
        <MerchantMatch merchant="Merchant B" detail="Claim · 5/03/25" status="Matched" />
        <MerchantMatch merchant="Merchant C" detail="Chargeback · 4/28/25" status="Matched" />
        <div className="rounded-lg border border-[#ececec] bg-white px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 gap-2.5">
              <IconBox small>
                <Workflow size={13} />
              </IconBox>
              <div>
                <div className="text-[13px] font-semibold tracking-[-0.03em]">Pattern</div>
                <div className="mt-0.5 text-[12px] leading-[1.2] text-[#555555]">
                  “Never arrived” opened after delivery
                </div>
              </div>
            </div>
            <span className="shrink-0 rounded-md bg-[#e4d7ff] px-2 py-0.5 text-[11px] font-semibold text-[#6b43c9]">
              Consistent
            </span>
          </div>
        </div>
      </div>
    </FeatureCard>
  );
}

function BottomStrip() {
  return (
    <section className="mt-6 grid min-h-[128px] grid-cols-1 items-center gap-6 rounded-xl border border-[#dedede] bg-[#f5f4f1] px-7 py-6 text-[#111111] md:grid-cols-[260px_1fr_280px]">
      <div className="flex gap-5">
        <NumberBadge>04</NumberBadge>
        <h2 className="max-w-[230px] text-[25px] font-semibold leading-[1.08] tracking-[-0.06em]">
          Evidence packs, one click from every ticket
        </h2>
      </div>
      <p className="max-w-[520px] text-[14px] leading-[1.45] tracking-[-0.02em] text-[#333333]">
        Open the evidence pack from the claim review flow, review the timeline and cross-merchant
        context, then decide with confidence.
      </p>
      <Link
        href={FL_ROUTES.demo}
        prefetch={false}
        className="flex h-[58px] items-center justify-between rounded-lg border border-[#dddddd] bg-white px-5 shadow-[0_12px_30px_rgba(0,0,0,0.06)] transition hover:border-black/28"
      >
        <div className="flex items-center gap-4">
          <FolderOpen size={24} />
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.03em]">Open evidence pack</div>
            <div className="mt-1 text-[13px] text-[#666666]">One click from the ticket</div>
          </div>
        </div>
        <ArrowRight size={17} />
      </Link>
    </section>
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

function IconBox({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-lg border border-[#e5e5e5] bg-[#fafafa] ${
        small ? 'h-7 w-7' : 'h-9 w-9'
      }`}
    >
      {children}
    </div>
  );
}

function DecisionLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <ShieldCheck size={14} className="shrink-0 text-[#555555]" />
      <span>{children}</span>
    </div>
  );
}

function ContextRow({
  icon,
  label,
  value,
  badge,
  green = false,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  badge?: string;
  green?: boolean;
}) {
  return (
    <div className="flex min-h-[36px] items-center justify-between gap-2 rounded-lg border border-[#e8e8e8] bg-white px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#666666]">{icon}</span>
        <span className="text-[12px] font-semibold leading-[1.1] tracking-[-0.025em]">{label}</span>
      </div>
      {value && (
        <span className="shrink-0 text-right text-[11px] leading-[1.15] text-[#555555]">{value}</span>
      )}
      {badge && (
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            green ? 'bg-[#dff5d7] text-[#4d8d3d]' : 'bg-[#e4d7ff] text-[#6b43c9]'
          }`}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function MerchantMatch({
  merchant,
  detail,
  status,
}: {
  merchant: string;
  detail: string;
  status: string;
}) {
  return (
    <div className="flex min-h-[48px] items-center justify-between rounded-lg border border-[#ececec] bg-white px-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <IconBox small>
          <Store size={13} />
        </IconBox>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold tracking-[-0.03em]">{merchant}</div>
          <div className="mt-0.5 text-[11px] leading-[1.1] text-[#555555]">{detail}</div>
        </div>
      </div>
      <span className="shrink-0 rounded-md bg-[#dff5d7] px-2 py-0.5 text-[11px] font-semibold text-[#4d8d3d]">
        {status}
      </span>
    </div>
  );
}
