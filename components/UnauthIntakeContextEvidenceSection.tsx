'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDot,
  Cloud,
  MessageSquare,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  TicketCheck,
} from 'lucide-react';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

export default function UnauthIntakeContextEvidenceSection() {
  return (
    <section className="relative bg-[var(--fl-bg)] text-[#111111]" data-nav-theme="light">
      <main className="relative z-10 mx-auto max-w-[1536px] px-5 py-14 sm:px-8 lg:px-10 lg:py-16">
        <div className="relative mx-auto min-h-[800px] max-w-[1320px] sm:min-h-[720px]">
          <Stage />

          <div className="absolute left-5 top-[132px] z-30 max-w-[315px] -translate-x-[10%] sm:left-10 lg:left-12 lg:top-[112px] xl:left-14">
            <p className={foundationStyles.landingSectionEyebrow}>
              Intake → Context → Evidence
            </p>
            <h2 className={foundationStyles.landingSectionTitle}>
              From support ticket to evidence pack.
            </h2>
            <p className={`${foundationStyles.landingSectionLead} max-w-[300px]`}>
              Unauth ingests claim, order, and helpdesk data, extracts the context that matters,
              and generates a merchant-ready evidence package.
            </p>
            <Link
              href="/landing#how-it-works"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.14] bg-white px-5 text-[14px] font-semibold tracking-[-0.02em] text-black/72 shadow-[0_10px_28px_rgba(0,0,0,0.06)] transition hover:border-black/28 hover:text-black"
            >
              See how it works
              <ArrowUpRight size={15} />
            </Link>
            <h3 className="sr-only">
              Intake → Context → Evidence
            </h3>
          </div>
        </div>
      </main>
    </section>
  );
}

const intakeCardShadow =
  'shadow-[0_24px_56px_rgba(0,0,0,0.11)]';

function Stage() {
  return (
    <div className="relative min-h-[800px] pb-6 sm:min-h-[720px]">
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-[330px] top-[126px] hidden h-[500px] w-[320px] md:block lg:left-[300px] xl:left-[330px]"
      >
        <ProcessCard
          faded
          stepColor="green"
          step="1"
          title="Ingest claim data"
          subtitle="Orders, refunds, chargebacks, fulfilment records, customer identifiers"
          status="Merchant store"
          tier="Synced"
          revenue="12,150"
          recordsLabel="Records"
          requestLabel="Data sources"
          requestCount="8"
          sections={[
            {
              label: 'Store data',
              items: [
                { label: 'Orders', tone: 'green' },
                { label: 'Refunds & returns', tone: 'green' },
                { label: 'Chargebacks', tone: 'green' },
              ],
            },
            {
              label: 'Customer signals',
              items: [
                { label: 'Email & phone', tone: 'yellow' },
                { label: 'Billing & shipping', tone: 'yellow' },
                { label: 'Device & IP data', tone: 'green' },
              ],
            },
          ]}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-[390px] top-[94px] z-10 hidden h-[540px] w-[370px] sm:block lg:left-[560px] xl:left-[590px]"
      >
        <ProcessCard
          stepColor="rust"
          step="2"
          title="Pull helpdesk context"
          subtitle="Ticket messages, refund pressure, claim reason, urgency, support history"
          status="Helpdesk"
          tier="Active"
          revenue="8,390"
          recordsLabel="Cases"
          requestLabel="Conversations"
          requestCount="14"
          sections={[
            {
              label: 'Customer messages',
              items: [
                { label: '“My order never arrived”', tone: 'green' },
                { label: '“I want a full refund”', tone: 'green' },
                { label: '“Items are missing”', tone: 'green' },
                { label: '“I’ll file a chargeback”', tone: 'yellow' },
              ],
            },
            {
              label: 'Extracted context',
              items: [
                { label: 'Claim reason', tone: 'blue' },
                { label: 'Sentiment & urgency', tone: 'rust' },
              ],
            },
          ]}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.75, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-5 right-5 top-[330px] z-20 w-auto sm:left-1/2 sm:right-auto sm:top-[74px] sm:w-[480px] sm:-translate-x-1/2 lg:left-[800px] lg:translate-x-0 xl:left-[850px]"
      >
        <EvidenceCard />
      </motion.div>
    </div>
  );
}

function ProcessCard({
  faded = false,
  stepColor,
  step,
  title,
  subtitle,
  status,
  tier,
  revenue,
  recordsLabel = 'Records',
  requestLabel,
  requestCount,
  sections,
}: {
  faded?: boolean;
  stepColor: 'green' | 'rust';
  step: string;
  title: string;
  subtitle?: string;
  status: string;
  tier: string;
  revenue: string;
  recordsLabel?: string;
  requestLabel: string;
  requestCount: string;
  sections: Array<{
    label: string;
    items: Array<{ label: string; tone: StatusTone }>;
  }>;
}) {
  return (
    <div
      className={`h-full overflow-hidden rounded-[16px] border border-black/[0.09] bg-white p-[28px] ${intakeCardShadow} ${
        faded ? 'opacity-[0.47]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <StepDot color={stepColor}>{step}</StepDot>
        <div className="text-[18px] font-semibold tracking-[-0.035em] text-[#111111]">{title}</div>
      </div>

      {subtitle && (
        <p className="mt-3 pl-[39px] text-[13px] tracking-[-0.01em] text-black/46">{subtitle}</p>
      )}

      <div className="mt-[31px] grid grid-cols-3 gap-5">
        <Stat label="Status" value={tier} />
        <Stat label="Source" value={status} />
        <Stat label={recordsLabel} value={revenue} muted />
      </div>

      <div className="mt-[24px] h-px bg-black/[0.075]" />

      <div className="mt-[24px] text-[14px] font-semibold tracking-[-0.02em] text-black/84">
        {requestLabel} <span className="ml-1.5 text-black/60">{requestCount}</span>
      </div>

      <div className="mt-[22px] space-y-[22px]">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="mb-3 flex items-center gap-3">
              <div className="text-[14px] tracking-[-0.01em] text-black/40">{section.label}</div>
              <div className="h-px flex-1 bg-black/[0.07]" />
            </div>
            <div className="space-y-2.5">
              {section.items.map((item) => (
                <SmallLine key={item.label} tone={item.tone}>
                  {item.label}
                </SmallLine>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceCard() {
  return (
    <div
      className={`overflow-hidden rounded-[16px] border border-black/[0.09] bg-white p-[28px] ${intakeCardShadow}`}
    >
      <div className="flex items-center gap-3">
        <StepDot color="coral">3</StepDot>
        <div className="text-[18px] font-semibold tracking-[-0.035em] text-[#111111]">
          Assemble evidence pack
        </div>
      </div>

      <div className="mt-[31px] grid grid-cols-[1fr_1fr_1fr_1.25fr] gap-5">
        <Stat label="Status" value="Ready" />
        <Stat label="Type" value="Evidence" />
        <Stat label="Claim value" value="$162.40" />
        <div>
          <div className="text-[13px] tracking-[-0.01em] text-black/34">Built from</div>
          <div className="mt-2 flex items-center gap-1.5 text-[14px] font-medium tracking-[-0.02em] text-black/72">
            <Cloud size={14} className="text-black/42" />
            Helpdesk
          </div>
        </div>
      </div>

      <div className="mt-[24px] h-px bg-black/[0.075]" />

      <div className="mt-[25px] text-[14px] font-semibold tracking-[-0.02em] text-black/86">
        Evidence package <span className="ml-1.5 text-black/62">11</span>
      </div>

      <div className="mt-[24px] space-y-[22px]">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="text-[14px] tracking-[-0.01em] text-black/40">Included</div>
            <div className="h-px flex-1 bg-black/[0.07]" />
          </div>
          <div className="space-y-3">
            <EvidenceLine icon={<TicketCheck size={15} />}>Claim timeline</EvidenceLine>
            <EvidenceLine icon={<MessageSquare size={15} />}>
              Customer conversation history
            </EvidenceLine>
            <EvidenceLine icon={<ShoppingBag size={15} />}>Order history & receipts</EvidenceLine>
            <EvidenceLine icon={<RefreshCcw size={15} />}>Refund and return activity</EvidenceLine>
            <EvidenceLine icon={<ShieldCheck size={15} />}>
              Policy and chargeback context
            </EvidenceLine>
            <EvidenceLine icon={<Cloud size={15} />}>Cross-merchant signals</EvidenceLine>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="text-[14px] tracking-[-0.01em] text-black/40">Other</div>
            <div className="h-px flex-1 bg-black/[0.07]" />
          </div>
          <div className="space-y-3">
            <SmallLine tone="yellow">Privacy-safe pattern context</SmallLine>
            <SmallLine tone="red">Evidence summary PDF</SmallLine>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDot({
  color,
  children,
}: {
  color: 'green' | 'rust' | 'coral';
  children: ReactNode;
}) {
  const style: React.CSSProperties =
    color === 'green'
      ? { background: '#9bea55', color: '#071007' }
      : color === 'rust'
        ? { background: '#A85040', color: 'white', boxShadow: '0 0 0 4px rgba(168,80,64,0.14)' }
        : { background: '#ff765f', color: '#120806' };

  return (
    <div
      className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
      style={style}
    >
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className={muted ? 'opacity-28' : ''}>
      <div className="text-[13px] tracking-[-0.01em] text-black/36">{label}</div>
      <div className="mt-2 text-[14px] font-medium tracking-[-0.025em] text-black/76">{value}</div>
    </div>
  );
}

type StatusTone = 'green' | 'yellow' | 'red' | 'blue' | 'rust' | 'orange' | 'neutral';

function SmallLine({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[14px] tracking-[-0.018em] text-black/60">
      <StatusIcon tone={tone} />
      <span>{children}</span>
    </div>
  );
}

function EvidenceLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[18px_1fr_auto] items-center gap-3 text-[14px] tracking-[-0.018em] text-black/60">
      <span className="text-black/42">{icon}</span>
      <span>{children}</span>
      <CheckCircle2 size={14} className="text-[#2fb84f]" fill="currentColor" />
    </div>
  );
}

function StatusIcon({ tone }: { tone: StatusTone }) {
  if (tone === 'green') {
    return <CheckCircle2 size={14} className="text-[#2fb84f]" fill="currentColor" />;
  }
  if (tone === 'yellow') {
    return <CircleAlert size={14} className="text-[#f2c94c]" />;
  }
  if (tone === 'red') {
    return <CircleAlert size={14} className="text-[#ff4d3d]" />;
  }
  if (tone === 'blue') {
    return <CircleDot size={14} className="text-[#2f80ed]" />;
  }
  if (tone === 'rust') {
    return <CircleDot size={14} style={{ color: '#A85040' }} />;
  }
  if (tone === 'orange') {
    return <CircleDot size={14} className="text-[#ff7a3d]" />;
  }
  return <Circle size={14} className="text-black/32" />;
}
