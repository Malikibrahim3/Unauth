'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleDot,
  ClipboardList,
  ExternalLink,
  PackageCheck,
} from 'lucide-react';
import {
  FL_DEMO_PRODUCT_CARDS,
  FL_ROUTES,
} from '@/app/(public)/landing/_lib/foundationContent';
import MobileCollapse from '@/app/(public)/landing/_components/foundation/MobileCollapse';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';
import {
  MockBrowserFrame,
  SectionBody,
  SectionEyebrow,
  SectionHeadline,
  StepBadge,
  type StepBadgeVariant,
  uiTokens,
} from '@/components/ui';

const demo = FL_DEMO_PRODUCT_CARDS;

export default function EvidenceNotVerdictsRampSection() {
  return (
    <section
      id="how-it-works"
      className="relative min-h-screen scroll-mt-24 overflow-hidden bg-white text-[#111111] border-t border-black/[0.07]"
      data-nav-theme="light"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_24%,rgba(0,0,0,0.055),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white to-transparent" />

      <main className="relative mx-auto hidden max-w-[1180px] px-6 pb-24 pt-20 md:pt-24 min-[769px]:block">
        <ClaimGateWrapper />
        <CategoryComparison />
      </main>

      <main className="relative px-4 pb-20 pt-16 min-[769px]:hidden">
        <MobileCollapse collapsedLabel="See how the gate works">
          <ClaimGateWrapper />
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

function ClaimGateWrapper() {
  return (
    <div className="mb-10">
      <SectionIntro />
      <GateArtifactsRow />
    </div>
  );
}

export function GateArtifactsRow({
  scale = 1,
  align = 'viewport',
}: {
  scale?: number;
  align?: 'viewport' | 'content';
}) {
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);
  // Width from the aligned content line out to the right viewport edge. The
  // track is clipped to this so cards crop exactly at the left margin and
  // reveal out to the right edge — nothing spills into the left gutter.
  const [clipWidth, setClipWidth] = useState<number | null>(null);
  // Viewport height drives the pin so the sticky region always covers the
  // screen while the horizontal scroll runs — the next section can't peek up.
  const [viewportHeight, setViewportHeight] = useState(0);
  const stickyPinTop = 120;

  useEffect(() => {
    if (align !== 'content') return;

    const updateMeasurements = () => {
      const pin = pinRef.current;
      const track = trackRef.current;
      if (!pin || !track) return;

      const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const visibleWidth = Math.max(1, viewportWidth - pin.getBoundingClientRect().left);
      const nextDistance = Math.max(0, track.offsetWidth - visibleWidth);

      setScrollDistance(nextDistance);
      setClipWidth(visibleWidth);
      setViewportHeight(window.innerHeight);
    };

    updateMeasurements();

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateMeasurements);
    if (trackRef.current) {
      resizeObserver?.observe(trackRef.current);
    }

    window.addEventListener('resize', updateMeasurements);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateMeasurements);
    };
  }, [align, scale]);

  useEffect(() => {
    if (align !== 'content') return;

    let animationFrame = 0;

    const updateTransform = () => {
      animationFrame = 0;
      const pin = pinRef.current;
      const track = trackRef.current;
      if (!pin || !track) return;

      const progress = Math.min(
        Math.max(stickyPinTop - pin.getBoundingClientRect().top, 0),
        scrollDistance,
      );
      track.style.transform = `translate3d(${-progress}px, 0, 0)`;
    };

    const onScroll = () => {
      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(updateTransform);
      }
    };

    updateTransform();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [align, scrollDistance, stickyPinTop]);

  const row = (
    <div className="flex w-max gap-6">
      <ArrivalCard scale={scale} />
      <EvidenceCard scale={scale} />
      <RulesRunCard scale={scale} />
      <LossAttributionCard scale={scale} />
      <AuditCard scale={scale} />
    </div>
  );

  if (align === 'viewport') {
    return (
      <div className="relative left-1/2 mt-10 w-screen -translate-x-1/2 overflow-x-auto px-6 pb-4 [scrollbar-width:thin]">
        {row}
      </div>
    );
  }

  const pinActive = scrollDistance > 0 && viewportHeight > 0;
  // Sticky region fills from the nav offset to the viewport bottom; the pin
  // reserves that plus the horizontal-scroll runway. Container bottom never
  // enters the viewport until the cards finish, so nothing below peeks up.
  const stickyHeight = Math.max(0, viewportHeight - stickyPinTop);

  return (
    <div
      ref={pinRef}
      className="mt-10 -translate-x-[15px]"
      style={{ height: pinActive ? `${stickyHeight + scrollDistance}px` : undefined }}
    >
      <div
        className="sticky top-[120px] flex items-center overflow-x-clip"
        style={{
          height: pinActive ? `${stickyHeight}px` : undefined,
          width: clipWidth ?? undefined,
        }}
      >
        <div ref={trackRef} className="flex w-max gap-6 will-change-transform">
          <ArrivalCard scale={scale} />
          <EvidenceCard scale={scale} />
          <RulesRunCard scale={scale} />
          <LossAttributionCard scale={scale} />
          <AuditCard scale={scale} />
        </div>
      </div>
    </div>
  );
}

function SectionIntro() {
  return (
    <div className="mb-10 max-w-[760px]">
      <SectionEyebrow className={foundationStyles.landingSectionEyebrow}>
        THE CLAIM GATE
      </SectionEyebrow>
      <SectionHeadline className={foundationStyles.landingSectionTitle}>
        Sits between the AI decision and the payout. Every time.
      </SectionHeadline>
      <SectionBody className={`${foundationStyles.landingSectionLead} max-w-[700px]`}>
        Gorgias AI queues the refund. Unauth intercepts it, assembles the evidence, and assigns the
        recovery route — before your team sees a single claim.
      </SectionBody>
    </div>
  );
}

function FeatureCard({
  number,
  title,
  children,
  scale = 1,
}: {
  number: StepBadgeVariant;
  title: string;
  children: ReactNode;
  scale?: number;
}) {
  const stepStyle = uiTokens.stepBadges[number];
  const scaleStyle: React.CSSProperties =
    scale === 1
      ? {}
      : {
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginRight: `${362 * (scale - 1)}px`,
          marginBottom: `${620 * (scale - 1)}px`,
        };

  return (
    <article
      className={`flex min-h-[620px] w-[362px] shrink-0 flex-col rounded-[10px] border border-[rgba(20,24,31,0.10)] bg-[#f6f5f2] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ${stepStyle.text}`}
      style={scaleStyle}
    >
      <div className="flex items-start justify-between gap-3">
        <StepBadge variant={number} />
        <OpenButton />
      </div>
      <h2 className="mt-5 max-w-[280px] text-[26px] font-semibold leading-[1.08] tracking-[-0.06em] text-[#1d2027]">
        {title}
      </h2>
      <div className="mt-auto flex justify-center pt-14">
        <MockBrowserFrame topBorderClassName={stepStyle.topBorder}>{children}</MockBrowserFrame>
      </div>
    </article>
  );
}

function ArrivalCard({ scale }: { scale?: number }) {
  return (
    <FeatureCard number="01" title="A claim arrives" scale={scale}>
      <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.04em]">Helpdesk claim</h3>
      <div className="space-y-2">
        <ContextRow icon={<PackageCheck size={14} />} label="Gorgias ticket received" />
        <ContextRow icon={<PackageCheck size={14} />} label="Refund intent detected" />
        <ContextRow icon={<PackageCheck size={14} />} label="Order #UA-10482 linked" />
        <ContextRow icon={<PackageCheck size={14} />} label="Item-not-received detected" />
      </div>
      <CardNote>
        Gorgias AI approved the refund. Unauth intercepts it before the payout clears.
      </CardNote>
    </FeatureCard>
  );
}

function EvidenceCard({ scale }: { scale?: number }) {
  return (
    <FeatureCard number="02" title="The gate checks it" scale={scale}>
      <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.04em]">Delivery &amp; order evidence</h3>
      <div className="space-y-2">
        {demo.evidence.items.map((item) => (
          <ContextRow key={item} icon={<PackageCheck size={14} />} label={item} />
        ))}
      </div>
      <CardNote>Example: item-not-received with connected delivery proof.</CardNote>
    </FeatureCard>
  );
}

function AuditCard({ scale }: { scale?: number }) {
  return (
    <FeatureCard number="05" title="The outcome is recorded" scale={scale}>
      <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.04em]">Permanent decision record</h3>
      <div className="space-y-2">
        {demo.audit.items.map((item) => (
          <ContextRow key={item} icon={<ClipboardList size={14} />} label={item} />
        ))}
      </div>
      <CardNote>
        Decision, evidence, loss owner, and recovery route are documented permanently.
      </CardNote>
    </FeatureCard>
  );
}

function RulesRunCard({ scale }: { scale?: number }) {
  const rules = [
    'Order value: above threshold',
    'Claim count: 3rd claim this quarter',
    'Delivery state: confirmed',
    'Customer pattern: flagged',
  ] as const;

  return (
    <FeatureCard number="03" title="Your rules run" scale={scale}>
      <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.04em]">Merchant rules</h3>
      <div className="space-y-2">
        {rules.map((rule) => (
          <ContextRow key={rule} icon={<CheckCircle2 size={14} />} label={rule} />
        ))}
      </div>
      <CardNote>
        Your rules. Not Unauth&apos;s defaults. Every hold is traceable back to the rule that
        triggered it.
      </CardNote>
    </FeatureCard>
  );
}

function LossAttributionCard({ scale }: { scale?: number }) {
  const rows = [
    { label: 'Carrier fault', selected: true },
    { label: 'Warehouse error', selected: false },
    { label: 'Repeat claimant', selected: false },
    { label: 'Policy override', selected: false },
  ] as const;

  return (
    <FeatureCard number="04" title="Loss is attributed" scale={scale}>
      <h3 className="mb-4 text-[16px] font-semibold tracking-[-0.04em]">Loss owner</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <ContextRow
            key={row.label}
            icon={row.selected ? <CircleDot size={14} /> : <Circle size={14} />}
            label={row.label}
            selected={row.selected}
          />
        ))}
      </div>
      <CardNote>Every loss gets an owner and a recovery route before the outcome is set.</CardNote>
    </FeatureCard>
  );
}

function CategoryComparison() {
  return (
    <section className="mt-10 rounded-xl border border-[#dedede] bg-[#f5f4f1] px-6 py-8">
      <p className={foundationStyles.landingSectionEyebrow}>Step tag labels</p>
      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
        <ComparisonColumn
          title="Without the gate"
          items={[
            'Safe claims pass straight through',
            'Risky claims are held',
            'Outcomes are logged',
          ]}
          muted
        />
        <ComparisonColumn
          title="With Unauth"
          items={[
            'Cleared',
            'Held',
            'Logged',
          ]}
        />
      </div>
      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link
          href={FL_ROUTES.audit}
          prefetch={false}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#111111] px-5 text-[14px] font-semibold text-white"
        >
          See the gate in action
          <ArrowRight size={15} />
        </Link>
        <p className="text-[13px] leading-[1.45] text-[#555555]">
          Turn your automation all the way up. The gate still catches the claims that should never have been auto-paid.
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

function OpenButton() {
  return (
    <button
      type="button"
      aria-label="Open preview"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[rgba(20,24,31,0.10)] bg-[#fbfbfa] shadow-[0_4px_14px_rgba(0,0,0,0.05)]"
    >
      <ExternalLink size={18} />
    </button>
  );
}

function ContextRow({
  icon,
  label,
  selected = false,
}: {
  icon: ReactNode;
  label: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[36px] items-center gap-2 rounded-lg border px-3 py-2 ${
        selected
          ? 'border-[#d9eadc] bg-[#f3fbf4]'
          : 'border-[rgba(20,24,31,0.074)] bg-[#fbfbfa]'
      }`}
    >
      <span className={`shrink-0 ${selected ? 'text-[#1f9d57]' : 'text-[#707784]'}`}>{icon}</span>
      <span
        className={`text-[12px] font-medium leading-[1.2] tracking-[-0.025em] ${
          selected ? 'text-[#1f5f35]' : 'text-[#1d2027]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// Shared footnote for every card. Fixed min-height so all five panels are the
// same height → their browser-window tops and bottoms line up across the row.
function CardNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3.5 flex min-h-[76px] items-start rounded-lg border border-[rgba(20,24,31,0.066)] bg-[#fbfbfa] px-3.5 py-3 text-[12px] leading-[1.35] text-[#707784]">
      {children}
    </div>
  );
}
