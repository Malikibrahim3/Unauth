'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  Hash,
  ImageIcon,
  Mic,
  MoreHorizontal,
  Plus,
  Send,
  Smile,
  Video,
} from 'lucide-react';
import MobileCollapse from '@/app/(public)/landing/_components/foundation/MobileCollapse';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';

export default function UnauthLinearClaimHero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-white text-[#111111] border-t border-black/[0.07]" data-nav-theme="light">
      <Background />

      {/* Desktop / tablet-landscape (≥769px) — original layout, untouched */}
      <main className="relative z-10 mx-auto hidden max-w-[1536px] px-5 pb-20 pt-16 sm:px-8 lg:px-10 lg:pt-12 min-[769px]:block">
        <div className="mb-[42px] grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_auto] lg:items-end">
          <div className="max-w-[690px]">
            <p className={foundationStyles.landingSectionEyebrow}>
              Claim patterns
            </p>
            <h2 className={foundationStyles.landingSectionTitle}>
              Common complaints become cross-merchant evidence.
            </h2>
            <p className={`${foundationStyles.landingSectionLead} max-w-[620px]`}>
              “Never arrived”, missing items, damaged orders, late delivery, refund pressure —
              Unauth links isolated claims to cross-merchant patterns — so your team reviews
              evidence, not noise.
            </p>
          </div>
          <div className="flex items-center gap-4 justify-self-start font-mono text-[15px] tracking-[-0.02em] text-black/42 lg:justify-self-end">
            <span>1.0</span>
            <span>Claim intake</span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div className="relative mx-auto max-w-[1380px] lg:h-[630px]">
          <ClaimThread />
          {/* Board scrolls horizontally below lg, pins beside the thread (absolute) from lg up. */}
          <div className="-mx-5 mt-8 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:mt-0 lg:overflow-visible lg:px-0">
            <ClaimsBoard />
          </div>
        </div>
      </main>

      {/* Mobile (≤768px) — Stripe-style collapse: title + artifact, tap to reveal copy */}
      <main className="relative z-10 px-4 pb-16 pt-14 min-[769px]:hidden">
        <MobileCollapse collapsedLabel="See the claim flow">
          <p className={foundationStyles.landingSectionEyebrow}>Claim patterns</p>
          <h2 className={`${foundationStyles.landingSectionTitle} mt-3`}>
            Common complaints become cross-merchant evidence.
          </h2>

          <div className="mt-8 flex flex-col items-center gap-8">
            <ClaimThread />
            <div className={`${foundationStyles.mobileFitBoard914} mx-auto`}>
              <ClaimsBoard />
            </div>
          </div>

          <div className={foundationStyles.collapseDetails}>
            <div className={foundationStyles.collapseDetailsInner}>
              <p className={foundationStyles.landingSectionLead}>
                “Never arrived”, missing items, damaged orders, late delivery, refund pressure —
                Unauth links isolated claims to cross-merchant patterns — so your team reviews
                evidence, not noise.
              </p>
              <div className="mt-5 flex items-center gap-3 font-mono text-[14px] tracking-[-0.02em] text-black/42">
                <span>1.0</span>
                <span>Claim intake</span>
                <ArrowRight size={15} />
              </div>
            </div>
          </div>
        </MobileCollapse>
      </main>
    </section>
  );
}

function Background() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-white" />
      <div className="absolute left-1/2 top-[190px] h-[540px] w-[980px] -translate-x-1/2 rounded-full bg-black/[0.045] blur-[120px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(0,0,0,0.055),transparent_36%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.13] [mask-image:radial-gradient(circle_at_50%_45%,black_0%,transparent_63%)]" />
      <div className="absolute inset-x-0 top-0 h-[250px] bg-gradient-to-b from-white to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[420px] bg-gradient-to-t from-white via-white/94 to-transparent" />
      <div className="absolute left-0 top-0 h-full w-[430px] bg-gradient-to-r from-white to-transparent" />
      <div className="absolute right-0 top-0 h-full w-[430px] bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}

function ClaimThread() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-20 mx-auto w-full max-w-[520px] overflow-hidden rounded-[16px] border border-black/[0.12] bg-white/92 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_18px_45px_rgba(0,0,0,0.10),0_58px_120px_rgba(0,0,0,0.16)] backdrop-blur-2xl lg:absolute lg:left-0 lg:top-0 lg:mx-0 lg:w-[508px]"
    >
      <div className="flex h-[70px] items-center justify-between border-b border-black/[0.08] px-7">
        <div className="flex items-center gap-4 text-[18px] font-medium tracking-[-0.03em] text-black/48">
          <Hash size={20} />
          <span>Thread in #claims</span>
        </div>
        <MoreHorizontal size={19} className="text-black/40" />
      </div>

      <div className="px-7 pb-5 pt-8">
        <div className="space-y-7">
          <ThreadMessage
            avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face"
            name="lena"
            time="6:03 PM"
          >
            Customer says “never arrived” again. Third claim in 2 months.
          </ThreadMessage>
          <ThreadMessage
            avatar="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face"
            name="didier"
            time="6:03 PM"
          >
            We’ve seen this email across multiple merchants. Same address cluster too.
          </ThreadMessage>
          <ThreadMessage
            avatar="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face"
            name="andreas"
            time="6:03 PM"
          >
            Let’s pull full context before we reply. Pattern looks similar to prior INR cases.
          </ThreadMessage>
        </div>

        <Composer />
      </div>
    </motion.div>
  );
}

function ThreadMessage({
  avatar,
  name,
  time,
  children,
}: {
  avatar: string;
  name: string;
  time: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-4"
    >
      <img
        src={avatar}
        alt=""
        className="mt-1 h-[42px] w-[42px] shrink-0 rounded-lg object-cover ring-1 ring-black/10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <div className="text-[18px] font-semibold tracking-[-0.035em] text-[#111111]">{name}</div>
          <div className="text-[15px] text-black/38">{time}</div>
        </div>
        <p className="mt-2 max-w-[360px] text-[17px] leading-[1.46] tracking-[-0.025em] text-black/58">
          {children}
        </p>
      </div>
    </motion.div>
  );
}

function Composer() {
  const mentionStyle: React.CSSProperties = {
    background: '#F4E6E0',
    color: '#7B2D26',
    boxShadow: 'inset 0 0 0 1px rgba(168,80,64,0.24)',
  };

  return (
    <div className="mt-10 rounded-[14px] border border-black/[0.10] bg-[#f8f8f6] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_16px_36px_rgba(0,0,0,0.08)]">
      <div className="min-h-[95px] text-[19px] leading-[1.45] tracking-[-0.035em] text-[#111111]">
        <span className="rounded-md px-1.5 py-0.5 font-medium" style={mentionStyle}>@Unauth</span>{' '}
        open evidence pack for CB-2291
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="ml-0.5 inline-block h-[22px] w-px translate-y-[4px] bg-black/70"
        />
      </div>

      <div className="mt-7 flex items-center justify-between text-black/44">
        <div className="flex items-center gap-5">
          <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-black/[0.055]">
            <Plus size={22} />
          </div>
          <span className="text-[20px]">Aa</span>
          <Smile size={20} />
          <span className="text-[22px]">@</span>
          <Video size={20} />
          <Mic size={20} />
          <ImageIcon size={20} />
        </div>

        <button
          className="flex h-[34px] overflow-hidden rounded-md text-white"
          style={{
            background: '#A85040',
            boxShadow: '0 0 34px rgba(168,80,64,0.32)',
          }}
        >
          <span className="flex h-full w-[42px] items-center justify-center">
            <Send size={17} fill="currentColor" />
          </span>
          <span className="my-2 w-px bg-white/22" />
          <span className="flex h-full w-[34px] items-center justify-center">
            <ChevronDown size={16} />
          </span>
        </button>
      </div>
    </div>
  );
}

function ClaimsBoard() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 34 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.85, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 h-[580px] w-[914px] overflow-hidden rounded-[16px] border border-black/[0.11] bg-white/72 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_18px_46px_rgba(0,0,0,0.09),0_60px_130px_rgba(0,0,0,0.14)] backdrop-blur-xl lg:absolute lg:left-[508px] lg:top-[29px]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_36%_24%,rgba(0,0,0,0.035),transparent_38%)]" />

      <div className="relative grid h-full grid-cols-3 gap-3 p-4">
        <BoardColumn
          title="To do"
          count="71"
          type="todo"
          cards={[
            {
              id: 'CB-2291',
              title: 'Never arrived – $162.40',
              tags: ['INR', 'Delivery'],
              avatar:
                'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&h=60&fit=crop&crop=face',
            },
            {
              id: 'CB-2187',
              title: 'Item not as described',
              tags: ['INR'],
              avatar:
                'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=60&h=60&fit=crop&crop=face',
            },
            {
              id: 'CB-2043',
              title: 'Refund requested after delivery',
              tags: ['Policy'],
            },
            {
              id: 'CB-1988',
              title: 'Damaged item claim',
              tags: ['Quality'],
              muted: true,
            },
          ]}
        />

        <BoardColumn
          title="In progress"
          count="3"
          type="progress"
          cards={[
            {
              id: 'CB-1930',
              title: 'Claim review – repeated email signal',
              tags: ['Context'],
              avatar:
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&h=60&fit=crop&crop=face',
            },
            {
              id: 'CB-1865',
              title: 'Chargeback threatened',
              tags: ['Risk'],
              avatar:
                'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=60&h=60&fit=crop&crop=face',
            },
            {
              id: 'CB-1742',
              title: 'Repeat claim context needed',
              tags: ['INR', 'Evidence'],
              avatar:
                'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=60&h=60&fit=crop&crop=face',
            },
          ]}
        />

        <BoardColumn
          title="Done"
          count=""
          type="done"
          cards={[
            {
              id: 'CB-1721',
              title: 'Approved refund',
              tags: ['Approved'],
              avatar:
                'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=60&h=60&fit=crop&crop=face',
            },
            {
              id: 'CB-1682',
              title: 'Policy exception',
              tags: ['Approved'],
              avatar:
                'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face',
            },
            {
              id: 'CB-1609',
              title: 'Duplicate claim – closed',
              tags: ['Closed'],
              avatar:
                'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=60&h=60&fit=crop&crop=face',
            },
            {
              id: 'CB-1510',
              title: 'Resolved – shipped',
              tags: ['Closed'],
              avatar:
                'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=60&h=60&fit=crop&crop=face',
            },
          ]}
        />
      </div>

      <div className="absolute inset-y-0 right-0 w-[360px] bg-gradient-to-r from-transparent via-white/46 to-white/88" />
      <div className="absolute inset-x-0 bottom-0 h-[270px] bg-gradient-to-t from-white via-white/78 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-[80px] bg-gradient-to-b from-white/82 to-transparent" />
    </motion.div>
  );
}

function BoardColumn({
  title,
  count,
  type,
  cards,
}: {
  title: string;
  count?: string;
  type: 'todo' | 'progress' | 'done';
  cards: Array<{
    id: string;
    title: string;
    tags: string[];
    avatar?: string;
    muted?: boolean;
  }>;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex h-[52px] items-center justify-between px-4 text-[17px] tracking-[-0.03em] text-black/58">
        <div className="flex items-center gap-3">
          {type === 'todo' && <Circle size={17} className="text-black/38" />}
          {type === 'progress' && <CircleDot size={17} className="text-[#f4b82f]" />}
          {type === 'done' && (
            <CheckCircle2 size={18} style={{ color: '#A85040' }} fill="currentColor" />
          )}
          <span>{title}</span>
          {count && <span className="text-black/38">{count}</span>}
        </div>
        <div className="flex items-center gap-4 text-black/36">
          <Plus size={17} />
          <MoreHorizontal size={17} />
        </div>
      </div>

      <div className="space-y-3">
        {cards.map((card, index) => (
          <ClaimCard key={card.id} {...card} delay={index * 0.08} />
        ))}
      </div>
    </div>
  );
}

function ClaimCard({
  id,
  title,
  tags,
  avatar,
  muted,
  delay,
}: {
  id: string;
  title: string;
  tags: string[];
  avatar?: string;
  muted?: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 9 }}
      whileInView={{ opacity: muted ? 0.55 : 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.42, delay: 0.35 + delay }}
      className="relative min-h-[112px] rounded-lg border border-black/[0.07] bg-white/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(0,0,0,0.045)]"
    >
      {avatar && (
        <img
          src={avatar}
          alt=""
          className="absolute right-4 top-4 h-[22px] w-[22px] rounded-full object-cover ring-1 ring-black/12"
        />
      )}
      <div className="text-[13px] font-medium text-black/34">{id}</div>
      <div className="mt-2 max-w-[215px] text-[16px] leading-[1.35] tracking-[-0.025em] text-black/62">
        {title}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Tag key={tag} label={tag} />
        ))}
      </div>
    </motion.div>
  );
}

function Tag({ label }: { label: string }) {
  const tones: Record<string, { bg: string; color: string; dot: string; strong?: boolean }> = {
    INR: { bg: '#fff0f0', color: '#b33d3d', dot: '#d94f4f' },
    Delivery: { bg: '#F4E6E0', color: '#7B2D26', dot: '#A85040', strong: true },
    Policy: { bg: '#edf6ff', color: '#326ea8', dot: '#4f93d2' },
    Quality: { bg: '#edf9f2', color: '#2f8a58', dot: '#46b779' },
    Risk: { bg: '#F4E6E0', color: '#7B2D26', dot: '#A85040', strong: true },
    Context: { bg: '#F4E6E0', color: '#7B2D26', dot: '#A85040', strong: true },
    Evidence: { bg: '#F4E6E0', color: '#7B2D26', dot: '#A85040', strong: true },
    Approved: { bg: '#edf9f2', color: '#2f8a58', dot: '#46b779' },
    Closed: { bg: '#edf6ff', color: '#326ea8', dot: '#4f93d2' },
  };
  const tone = tones[label] || { bg: 'rgba(0,0,0,0.045)', color: 'rgba(0,0,0,0.5)', dot: 'rgba(0,0,0,0.4)' };

  const isNumber = /^\d/.test(label);
  if (isNumber) {
    return (
      <span className="inline-flex h-[27px] items-center rounded bg-black/[0.045] px-2.5 text-[14px] font-medium text-black/62">
        <span className="mr-1.5 text-[#50c878]">↟</span>
        {label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex h-[27px] items-center gap-1.5 rounded px-2.5 text-[14px] font-medium"
      style={{
        background: tone.bg,
        color: tone.color,
        boxShadow: tone.strong ? 'inset 0 0 0 1px rgba(168,80,64,0.16)' : undefined,
      }}
    >
      <span className="h-[4px] w-[4px] rounded-full" style={{ background: tone.dot }} />
      {label}
    </span>
  );
}
