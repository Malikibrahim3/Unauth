'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
    quarter: 'Q1',
    year: '2025',
    count: '23',
    cards: [
      {
        title: 'INR (Item Not Received)',
        quote: 'My order never arrived. It’s been over 10 days and I still don’t have it.',
        tag: 'Shipping / Delivery',
        icon: <Package size={20} />,
        tone: 'yellow',
        activity: 'up',
      },
      {
        title: 'Items Missing From Order',
        quote: 'I received my package but items are missing from my order.',
        tag: 'Order Accuracy',
        icon: <MapPin size={20} />,
        tone: 'yellow',
        activity: 'bars',
      },
      {
        title: 'Order Damaged',
        quote: 'The item arrived damaged and unusable.',
        tag: 'Product Condition',
        icon: <Box size={20} />,
        tone: 'red',
        activity: 'bars',
      },
      {
        title: 'Wrong Item Received',
        quote: 'I received a completely different item than what I ordered.',
        tag: 'Order Accuracy',
        icon: <RefreshCcw size={20} />,
        tone: 'purple',
        activity: 'bars',
      },
      {
        title: 'Package Stolen / Not Delivered',
        quote: 'Tracking shows delivered but I didn’t receive anything.',
        tag: 'Shipping / Delivery',
        icon: <Circle size={20} />,
        tone: 'yellow',
        activity: 'bars',
      },
    ],
  },
  {
    quarter: 'Q2',
    year: '2025',
    count: '18',
    cards: [
      {
        title: 'Refund-after-delivery (INR)',
        quote: 'I received the item but want a refund anyway.',
        tag: 'Refund Abuse',
        icon: <Truck size={20} />,
        tone: 'yellow',
        activity: 'up',
      },
      {
        title: 'Changed My Mind',
        quote: 'I’ve changed my mind and want to return for a full refund.',
        tag: 'Buyer’s Remorse',
        icon: <UserRound size={20} />,
        tone: 'red',
        activity: 'bars',
      },
      {
        title: 'Payment Issue / Declined',
        quote: 'My payment was declined but you still took my money.',
        tag: 'Payment Issues',
        icon: <CreditCard size={20} />,
        tone: 'yellow',
        activity: 'up',
      },
      {
        title: 'Didn’t Authorize This Order',
        quote: 'I didn’t place this order on my account.',
        tag: 'Fraudulent Claim',
        icon: <Shield size={20} />,
        tone: 'red',
        activity: 'bars',
      },
      {
        title: 'Overcharged / Wrong Amount',
        quote: 'I was charged the wrong amount for my order.',
        tag: 'Billing / Pricing',
        icon: <CircleDollarSign size={20} />,
        tone: 'yellow',
        activity: 'bars',
      },
    ],
  },
  {
    quarter: 'Q3',
    year: '2025',
    count: '15',
    cards: [
      {
        title: 'Return Policy Exploit',
        quote: 'You won’t accept my return but your policy says you should.',
        tag: 'Returns',
        icon: <Shield size={20} />,
        tone: 'neutral',
        activity: 'bars',
      },
      {
        title: 'Reshipment Abuse',
        quote: 'I claim missing items just to get them reshipped.',
        tag: 'INR',
        icon: <Box size={20} />,
        tone: 'yellow',
        activity: 'bars',
      },
      {
        title: 'Quality Not As Described',
        quote: 'The product quality is not as described on the website.',
        tag: 'Product Condition',
        icon: <AlertCircle size={20} />,
        tone: 'purple',
        activity: 'bars',
      },
      {
        title: 'Free Item / Bonus Abuse',
        quote: 'I didn’t receive my free item or bonus.',
        tag: 'Promotion Abuse',
        icon: <Gift size={20} />,
        tone: 'purple',
        activity: 'bars',
      },
      {
        title: 'Cancelled Order Shipped',
        quote: 'I cancelled this order but you shipped it anyway.',
        tag: 'Order Management',
        icon: <ShoppingCart size={20} />,
        tone: 'red',
        activity: 'bars',
      },
    ],
  },
  {
    quarter: 'Q4',
    year: '2025',
    count: '6',
    cards: [
      {
        title: 'Multi-Account Abuse',
        quote: 'I keep getting flagged but I’m just a different person.',
        tag: 'Identity',
        icon: <UsersRound size={20} />,
        tone: 'yellow',
        activity: 'up',
      },
      {
        title: 'Chargeback Threat',
        quote: 'I’ll just file a chargeback if you don’t refund me.',
        tag: 'Chargeback',
        icon: <CreditCard size={20} />,
        tone: 'red',
        activity: 'bars',
      },
      {
        title: 'Late Delivery Complaint',
        quote: 'My order took too long to arrive. I want a refund.',
        tag: 'Shipping / Delivery',
        icon: <Timer size={20} />,
        tone: 'purple',
        activity: 'bars',
      },
      {
        title: 'Policy Exception Request',
        quote: 'Make an exception this time, I’m a loyal customer.',
        tag: 'Policy Abuse',
        icon: <Shield size={20} />,
        tone: 'neutral',
        activity: 'bars',
      },
      {
        title: 'Poor Customer Service',
        quote: 'Your support is terrible and I want a full refund.',
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

export default function UnauthClaimsRoadmapSection() {
  return (
    <section id="evidence" className="relative min-h-screen scroll-mt-24 overflow-hidden bg-white text-[#111111] border-t border-black/[0.07]" data-nav-theme="light">
      <Background />

      <main className="relative z-10 mx-auto max-w-[1536px] px-5 pb-[58px] pt-16 sm:px-8 lg:px-[84px] lg:pt-[52px]">
        <div className="mx-auto mb-9 flex max-w-[1320px] flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[700px]">
            <p className={foundationStyles.landingSectionEyebrow}>
              Evidence pipeline
            </p>
            <h2 className={foundationStyles.landingSectionTitle}>
              Patterns your queue already knows.
            </h2>
            <p className={`${foundationStyles.landingSectionLead} max-w-[650px]`}>
              Every complaint type carries timing, order, and support context. Unauth groups the
              reason, finds repeated signals, and attaches a graded context pack to every ticket.
            </p>
          </div>
          <Link
            href="/audit"
            prefetch={false}
            className="inline-flex h-11 w-max items-center gap-2 rounded-full border border-black/[0.14] bg-white px-5 text-[14px] font-semibold tracking-[-0.02em] text-black/72 shadow-[0_10px_28px_rgba(0,0,0,0.06)] transition hover:border-black/28 hover:text-black"
          >
            Explore claim patterns
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto h-[660px] max-w-[1320px]"
        >
          {/* Horizontal scroll on small screens so all four quarters stay
              readable; full board from lg up. */}
          <div className="-mx-5 h-full overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:overflow-visible lg:px-0">
            <ClaimsBoard />
          </div>
        </motion.div>

        <BottomLabels />
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
    <div className="relative mx-auto h-full w-full min-w-[900px] overflow-hidden rounded-[16px] border border-black/[0.08] bg-white/74 shadow-[0_36px_110px_rgba(0,0,0,0.14)] lg:min-w-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(0,0,0,0.035),transparent_32%)]" />

      <div className="relative grid h-full grid-cols-4">
        {columns.map((column, index) => (
          <BoardColumn key={column.quarter} column={column} index={index} />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[86px] bg-gradient-to-b from-white/82 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[210px] bg-gradient-to-t from-white via-white/86 to-transparent" />
      <div className="pointer-events-none absolute left-0 top-0 h-full w-[92px] bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-[92px] bg-gradient-to-l from-white to-transparent" />
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
  return (
    <div
      className={`relative min-w-0 px-3 pb-6 pt-[22px] ${
        index > 0 ? 'border-l border-black/[0.07]' : ''
      }`}
    >
      <div className="mb-[18px] flex h-7 items-center justify-between px-3">
        <div className="flex items-center gap-4 text-[15px] tracking-[-0.035em]">
          <span className="font-semibold text-black/78">{column.quarter}</span>
          <span className="text-black/48">{column.year}</span>
          <span className="text-black/48">{column.count}</span>
        </div>
        <div className="flex items-center gap-4 text-black/48">
          <span className="text-[25px] leading-none">+</span>
          <span className="mb-1 text-[18px] leading-none">...</span>
        </div>
      </div>

      <div className="space-y-2.5">
        {column.cards.map((card, cardIndex) => (
          <RoadmapCard key={card.title} card={card} delay={0.08 * cardIndex + index * 0.04} />
        ))}
      </div>
    </div>
  );
}

function RoadmapCard({ card, delay }: { card: ClaimCard; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 9 }}
      whileInView={{ opacity: card.muted ? 0.35 : 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.44, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative min-h-[106px] rounded-[8px] border border-black/[0.07] bg-white/82 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_26px_rgba(0,0,0,0.055)]"
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
            “{card.quote}”
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
    </motion.div>
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

function BottomLabels() {
  return (
    <div className="relative z-10 mx-auto mt-12 grid max-w-[1320px] grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-y-10 lg:mt-[60px] lg:grid-cols-4 lg:gap-y-0">
      <BottomLabel title="Claim intake" body="Customer complaints are grouped by reason, timing, and order context." />
      <BottomLabel title="Evidence pipeline" body="Repeated patterns are surfaced without changing the helpdesk workflow." bordered />
      <BottomLabel title="Cross-merchant context" body="Signals are matched privacy-safely across participating merchants." bordered />
      <BottomLabel title="Human review" body="Unauth informs the decision. Your team makes it." bordered />
    </div>
  );
}

function BottomLabel({
  title,
  body,
  bordered = false,
}: {
  title: string;
  body: string;
  bordered?: boolean;
}) {
  return (
    <div className={`min-h-[64px] px-0 lg:px-6 ${bordered ? 'lg:border-l lg:border-black/[0.08]' : ''}`}>
      <h3 className="text-[17px] font-medium tracking-[-0.04em] text-black/48">{title}</h3>
      <p className="mt-3 max-w-[250px] text-[14px] leading-[1.45] tracking-[-0.015em] text-black/34">
        {body}
      </p>
    </div>
  );
}
