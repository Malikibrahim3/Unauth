'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Box,
  Circle,
  CircleDollarSign,
  CircleHelp,
  CreditCard,
  Gift,
  Mail,
  MapPin,
  Package,
  RefreshCcw,
  Shield,
  ShoppingCart,
  Timer,
  Truck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

type CardTone = 'yellow' | 'red' | 'purple' | 'green' | 'neutral';

type ClaimCard = {
  title: string;
  quote: string;
  tag: string;
  icon: ReactNode;
  tone: CardTone;
  activity?: 'up' | 'bars' | 'none';
  muted?: boolean;
};

const columns = [
  {
    quarter: '1ST CLAIM',
    year: '',
    count: '23',
    cards: [
      {
        title: 'Item Not Received',
        quote: `My order never arrived. It's been over 10 days and I still don't have it.`,
        tag: 'Shipping / Delivery',
        icon: <Package size={20} />,
        tone: 'yellow',
        activity: 'up',
      },
      {
        title: 'Items Missing From Order',
        quote: `I received my package but items are missing from my order.`,
        tag: 'Order Accuracy',
        icon: <MapPin size={20} />,
        tone: 'yellow',
        activity: 'bars',
      },
      {
        title: 'Order Damaged',
        quote: `The item arrived damaged and unusable.`,
        tag: 'Product Condition',
        icon: <Box size={20} />,
        tone: 'red',
        activity: 'bars',
      },
      {
        title: 'Wrong Item Received',
        quote: `I received a completely different item than what I ordered.`,
        tag: 'Order Accuracy',
        icon: <RefreshCcw size={20} />,
        tone: 'purple',
        activity: 'bars',
      },
      {
        title: 'Delivered But Not Received',
        quote: `Tracking shows delivered but I didn't receive anything.`,
        tag: 'Shipping / Delivery',
        icon: <Circle size={20} />,
        tone: 'yellow',
        activity: 'bars',
      },
    ],
  },
  {
    quarter: '2ND CLAIM',
    year: '',
    count: '18',
    cards: [
      {
        title: 'Refund After Delivery',
        quote: `It arrived, but I still want a refund.`,
        tag: 'Timing',
        icon: <Truck size={20} />,
        tone: 'yellow',
        activity: 'up',
      },
      {
        title: 'Changed My Mind',
        quote: `I've changed my mind and want to return for a full refund.`,
        tag: "Buyer's Remorse",
        icon: <UserRound size={20} />,
        tone: 'red',
        activity: 'bars',
      },
      {
        title: 'Payment Issue',
        quote: `My payment was declined but you still took my money.`,
        tag: 'Payment Issues',
        icon: <CreditCard size={20} />,
        tone: 'yellow',
        activity: 'up',
      },
      {
        title: 'Unauthorized Order',
        quote: `I didn't place this order on my account.`,
        tag: 'Account Claim',
        icon: <Shield size={20} />,
        tone: 'red',
        activity: 'bars',
      },
      {
        title: 'Overcharged',
        quote: `I was charged the wrong amount for my order.`,
        tag: 'Billing / Pricing',
        icon: <CircleDollarSign size={20} />,
        tone: 'yellow',
        activity: 'bars',
      },
    ],
  },
  {
    quarter: '3RD CLAIM',
    year: '',
    count: '15',
    cards: [
      {
        title: 'Return Policy Exception',
        quote: `Your policy says I should be able to return this.`,
        tag: 'Returns',
        icon: <Shield size={20} />,
        tone: 'neutral',
        activity: 'bars',
      },
      {
        title: 'Repeat Reshipment Request',
        quote: `Can you send the missing item again?`,
        tag: 'INR',
        icon: <Box size={20} />,
        tone: 'yellow',
        activity: 'bars',
      },
      {
        title: 'Quality Not As Described',
        quote: `The product quality is not as described on the website.`,
        tag: 'Product Condition',
        icon: <AlertCircle size={20} />,
        tone: 'purple',
        activity: 'bars',
      },
      {
        title: 'Free Item Missing',
        quote: `I didn't receive my free item or bonus.`,
        tag: 'Promotion',
        icon: <Gift size={20} />,
        tone: 'purple',
        activity: 'bars',
      },
      {
        title: 'Cancelled Order Shipped',
        quote: `I cancelled this order but you shipped it anyway.`,
        tag: 'Order Management',
        icon: <ShoppingCart size={20} />,
        tone: 'red',
        activity: 'bars',
      },
    ],
  },
  {
    quarter: 'FLAGGED',
    year: '',
    count: '6',
    cards: [
      {
        title: 'Multi-Account Pattern',
        quote: `I keep getting flagged but I'm a different person.`,
        tag: 'Identity',
        icon: <UsersRound size={20} />,
        tone: 'yellow',
        activity: 'up',
      },
      {
        title: 'Chargeback Threat',
        quote: `I'll just file a chargeback if you don't refund me.`,
        tag: 'Chargeback',
        icon: <CreditCard size={20} />,
        tone: 'red',
        activity: 'bars',
      },
      {
        title: 'Late Delivery Complaint',
        quote: `My order took too long to arrive. I want a refund.`,
        tag: 'Shipping / Delivery',
        icon: <Timer size={20} />,
        tone: 'purple',
        activity: 'bars',
      },
      {
        title: 'Policy Exception Request',
        quote: `Make an exception this time, I'm a loyal customer.`,
        tag: 'Policy',
        icon: <Shield size={20} />,
        tone: 'neutral',
        activity: 'bars',
      },
      {
        title: 'Support Escalation',
        quote: `Your support is terrible and I want a full refund.`,
        tag: 'Customer Service',
        icon: <Mail size={20} />,
        tone: 'purple',
        activity: 'bars',
      },
    ],
  },
] satisfies Array<{
  quarter: string;
  year: string;
  count: string;
  cards: ClaimCard[];
}>;

const callouts = [
  "How many times they’ve claimed with you this quarter.",
  "Whether the pattern matches a genuine loss or a habit.",
  "All of it visible before a single pound leaves your account.",
];

export default function UnauthClaimsRoadmapSection() {
  return (
    <section id="evidence" className="relative scroll-mt-24 overflow-hidden border-t border-black/[0.07] bg-white text-[#111111]" data-nav-theme="light">
      <Background />

      <main className="relative z-10 mx-auto max-w-[1536px] px-5 py-20 sm:px-8 lg:px-[84px]">
        <div className="mx-auto max-w-[1320px]">

          {/* Text row */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[560px]">
              <p className={foundationStyles.landingSectionEyebrow}>CLAIM INTELLIGENCE</p>
              <h2 className={foundationStyles.landingSectionTitle}>
                Know who&apos;s claiming before the refund leaves.
              </h2>
              <div className="mt-6 space-y-4">
                {callouts.map((line) => (
                  <p key={line} className="text-[17px] leading-[1.7] tracking-[-0.015em] text-black/52">
                    {line}
                  </p>
                ))}
              </div>
            </div>
            <Link
              href="/signup"
              prefetch={false}
              className="inline-flex h-11 w-max items-center gap-2 rounded-full border border-black/[0.14] bg-white px-5 text-[14px] font-semibold tracking-[-0.02em] text-black/72 shadow-[0_10px_28px_rgba(0,0,0,0.06)] transition hover:border-black/28 hover:text-black"
            >
              See how claim history works
              <ArrowUpRight size={15} />
            </Link>
          </div>

          {/* Board panel */}
          <div className="relative mt-10 rounded-[16px] border border-[#dedede] bg-[#f4f3f1] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="relative overflow-hidden rounded-[12px]">
              <ClaimsBoard />
              {/* Bottom fade */}
              <div className="pointer-events-none absolute bottom-0 left-0 w-full h-[80px] bg-[linear-gradient(to_bottom,transparent,#f4f3f1)]" />
            </div>
          </div>

        </div>
      </main>
    </section>
  );
}

function Background() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-white" />
      <div className="absolute left-1/2 top-[300px] h-[420px] w-[1050px] -translate-x-1/2 rounded-full bg-black/[0.04] blur-[105px]" />
      <div className="absolute inset-x-0 top-0 h-[215px] bg-gradient-to-b from-white to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[370px] bg-gradient-to-t from-white via-white/96 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,transparent_56%,rgba(0,0,0,0.05)_78%,rgba(0,0,0,0.10)_100%)]" />
    </div>
  );
}

function ClaimsBoard() {
  return (
    <div className="relative w-full min-w-[720px] rounded-[12px] border border-black/[0.08] bg-white/80 shadow-[0_24px_80px_rgba(0,0,0,0.10)]">
      <div className="absolute inset-0 rounded-[12px] bg-[radial-gradient(circle_at_50%_28%,rgba(0,0,0,0.03),transparent_32%)]" />

      <div className="relative grid grid-cols-4">
        {columns.map((column, index) => (
          <BoardColumn key={column.quarter} column={column} index={index} />
        ))}
      </div>
    </div>
  );
}

function BoardColumn({
  column,
  index,
}: {
  column: (typeof columns)[number];
  index: number;
}) {
  const cards = column.cards.slice(0, 2);
  return (
    <div
      className={`relative min-w-0 px-3 pb-6 pt-[22px] ${
        index > 0 ? 'border-l border-black/[0.07]' : ''
      }`}
    >
      <div className="mb-[18px] flex h-7 items-center justify-between px-3">
        <div className="flex items-center gap-2 text-[13px] tracking-[-0.035em]">
          <span className="font-semibold text-black/78">{column.quarter}</span>
          <span className="text-black/40">{column.count}</span>
        </div>
        <div className="flex items-center gap-3 text-black/40">
          <span className="text-[20px] leading-none">+</span>
          <span className="mb-1 text-[16px] leading-none">...</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {cards.map((card) => (
          <RoadmapCard key={card.title} card={card} />
        ))}
      </div>
    </div>
  );
}

function RoadmapCard({ card }: { card: ClaimCard }) {
  return (
    <div
      className="group relative min-h-[106px] rounded-[8px] border border-black/[0.07] bg-white/82 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_26px_rgba(0,0,0,0.055)]"
      style={{ opacity: card.muted ? 0.35 : 1 }}
    >
      <div className="absolute inset-0 rounded-[8px] bg-[radial-gradient(circle_at_45%_0%,rgba(0,0,0,0.025),transparent_55%)] opacity-80" />

      <div className="relative flex gap-3">
        <div className="flex h-[39px] w-[39px] shrink-0 items-center justify-center rounded-[7px] border border-black/[0.08] bg-black/[0.025] text-black/55">
          <span className={iconTone(card.tone)}>{card.icon}</span>
        </div>

        <div className="min-w-0 flex-1 pr-[54px]">
          <div className="truncate text-[13px] font-semibold tracking-[-0.03em] text-black/86">
            {card.title}
          </div>
          <p className="mt-2 line-clamp-2 max-w-[230px] text-[12px] leading-[1.45] tracking-[-0.015em] text-black/52">
            &ldquo;{card.quote}&rdquo;
          </p>
          <div className="mt-2.5 inline-flex h-[20px] items-center gap-1.5 rounded bg-black/[0.045] px-2 text-[11px] text-black/48">
            <CircleHelp size={11} />
            {card.tag}
          </div>
        </div>

        <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
          <StatusDot tone={card.tone} />
          {card.activity === 'up' && <ArrowUpRight size={15} className="text-[#23c55e]" />}
          {card.activity === 'bars' && <BarChart3 size={15} className="text-black/42" />}
        </div>
      </div>
    </div>
  );
}

function iconTone(tone: CardTone) {
  switch (tone) {
    case 'yellow':
      return 'text-[#facc15]';
    case 'red':
      return 'text-[#ff3b30]';
    case 'purple':
      return 'text-[#8b5cf6]';
    case 'green':
      return 'text-[#22c55e]';
    default:
      return 'text-black/52';
  }
}

function StatusDot({ tone }: { tone: CardTone }) {
  if (tone === 'neutral') {
    return <span className="h-[13px] w-[13px] rounded-full border-2 border-black/42" />;
  }

  const colors: Record<CardTone, string> = {
    yellow: 'border-[#facc15] text-[#facc15]',
    red: 'border-[#ff3b30] text-[#ff3b30]',
    purple: 'border-[#8b5cf6] text-[#8b5cf6]',
    green: 'border-[#22c55e] text-[#22c55e]',
    neutral: 'border-black/42 text-black/42',
  };

  return (
    <span
      className={`flex h-[14px] w-[14px] items-center justify-center rounded-full border-2 ${colors[tone]}`}
    >
      <span className="h-[3px] w-[3px] rounded-full bg-current" />
    </span>
  );
}

