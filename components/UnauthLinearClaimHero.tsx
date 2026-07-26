'use client';

import { ArrowRight } from 'lucide-react';
import MobileCollapse from '@/app/(public)/landing/_components/foundation/MobileCollapse';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';
import { type KanbanColumnItem, type ThreadPanelMessage } from '@/components/ui/LandingPrimitives';
import { KanbanBoard, SectionBody, SectionEyebrow, SectionHeadline, ThreadPanel } from '@/components/ui/LandingPrimitives';

const claimThreadMessages: ThreadPanelMessage[] = [
  {
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
    name: 'maya',
    time: '2:14 PM',
    message: 'Item not received — delivered with signature, 4th claim this quarter.',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face',
    name: 'support',
    time: '2:15 PM',
    message: 'Review required. Full claim history surfaced before the team records an outcome.',
  },
  {
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&crop=face',
    name: 'lead',
    time: '2:16 PM',
    message: 'Carrier and warehouse routes checked. Recovery case stays ready if the loss belongs elsewhere.',
  },
];

const claimColumns: KanbanColumnItem[] = [
  {
    title: 'Watching',
    count: '',
    type: 'todo',
    cards: [
      {
        id: 'C-9103',
        title: (
          <>
            3 claims · £218 absorbed
            <br />
            Last claim: 12 days ago
          </>
        ),
        tags: ['Wrong item', 'Flagged', '2nd offense'],
        evidence: {
          confirmed: false,
          line: 'Delivery confirmed — no dispute filed',
          timestamp: '2d',
        },
        avatar:
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=60&h=60&fit=crop&crop=face',
      },
      {
        id: 'C-3890',
        title: (
          <>
            2 claims · £134 absorbed
            <br />
            Last claim: 8 days ago
          </>
        ),
        tags: ['Late delivery', 'Flagged', '2nd offense'],
        evidence: {
          confirmed: false,
          line: 'Awaiting carrier response',
          timestamp: '8d',
        },
        avatar:
          'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=60&h=60&fit=crop&crop=face',
      },
    ],
  },
  {
    title: 'Under review',
    count: '',
    type: 'progress',
    cards: [
      {
        id: 'C-4821',
        title: (
          <>
            4 claims · £341 absorbed
            <br />
            Last claim: 3 days ago
          </>
        ),
        tags: ['Item not received', 'Review', 'Repeat pattern'],
        evidence: {
          confirmed: true,
          line: 'Carrier confirmation attached',
          timestamp: '3d',
        },
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&h=60&fit=crop&crop=face',
      },
      {
        id: 'C-6614',
        title: (
          <>
            5 claims · £490 absorbed
            <br />
            Last claim: 2 days ago
          </>
        ),
        tags: ['Item not received', 'Review', 'Repeat pattern'],
        evidence: {
          confirmed: true,
          line: 'Address mismatch flagged',
          timestamp: '2d',
        },
        avatar:
          'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=60&h=60&fit=crop&crop=face',
      },
    ],
  },
  {
    title: 'Resolved',
    count: '',
    type: 'done',
    cards: [
      {
        id: 'C-2277',
        title: (
          <>
            1 claim · £47 absorbed
            <br />
            Last claim: 41 days ago
          </>
        ),
        tags: ['Damaged', 'Cleared', 'First claim'],
        evidence: {
          confirmed: true,
          line: 'Delivery photo verified',
          timestamp: '41d',
        },
        avatar:
          'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=60&h=60&fit=crop&crop=face',
      },
    ],
  },
];

export default function UnauthLinearClaimHero() {
  return (
    <section id="gate-strip" className="relative min-h-screen overflow-hidden bg-white text-[#111111] border-t border-black/[0.07]" data-nav-theme="light">
      <Background />

      {/* Desktop / tablet-landscape (≥769px) — original layout, untouched */}
      <main className="relative z-10 mx-auto hidden max-w-[1536px] px-5 pb-20 pt-16 sm:px-8 lg:px-10 lg:pt-12 min-[769px]:block">
        <div className="mb-[42px] grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_auto] lg:items-end">
          <div className="max-w-[690px]">
            <SectionEyebrow className={foundationStyles.landingSectionEyebrow}>
              CLAIM INTELLIGENCE
            </SectionEyebrow>
            <SectionHeadline className={foundationStyles.landingSectionTitle}>
              Your best customers don&apos;t claim four times a quarter.
            </SectionHeadline>
            <SectionBody className={`${foundationStyles.landingSectionLead} max-w-[620px]`}>
              Unauth tracks every claim this customer has filed with you — by type, value, and outcome.
              A pattern that looks like bad luck once is visible as behaviour by the third time. Your team
              sees the history before the refund. Not after.
            </SectionBody>
          </div>
          <div className="flex items-center gap-4 justify-self-start font-mono text-[15px] tracking-[-0.02em] text-black/42 lg:justify-self-end">
            <span>1.0</span>
            <span>Gate routing — live</span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div className="relative mx-auto max-w-[1380px] lg:h-[630px]">
          <ThreadPanel messages={claimThreadMessages} />
          {/* Board scrolls horizontally below lg, pins beside the thread (absolute) from lg up. */}
          <div className="-mx-5 mt-8 overflow-x-auto px-5 pb-3 sm:-mx-8 sm:px-8 lg:mx-0 lg:mt-0 lg:overflow-visible lg:px-0">
            <KanbanBoard columns={claimColumns} />
          </div>
        </div>
      </main>

      {/* Mobile (≤768px) — Stripe-style collapse: title + artifact, tap to reveal copy */}
      <main className="relative z-10 px-4 pb-16 pt-14 min-[769px]:hidden">
        <MobileCollapse collapsedLabel="See the claim flow">
          <SectionEyebrow className={foundationStyles.landingSectionEyebrow}>
            CLAIM INTELLIGENCE
          </SectionEyebrow>
          <SectionHeadline className={`${foundationStyles.landingSectionTitle} mt-3 pr-14`}>
            Your best customers don&apos;t claim four times a quarter.
          </SectionHeadline>

          <div className="mt-8 flex flex-col gap-7">
            <ThreadPanel messages={claimThreadMessages} />
            <div className={foundationStyles.artifactRail}>
              <div className={foundationStyles.artifactRailScroll}>
                <KanbanBoard columns={claimColumns} />
              </div>
            </div>
          </div>

          <div className={foundationStyles.collapseDetails}>
            <div className={foundationStyles.collapseDetailsInner}>
              <SectionBody className={foundationStyles.landingSectionLead}>
                Unauth tracks every claim this customer has filed with you — by type, value, and outcome.
                A pattern that looks like bad luck once is visible as behaviour by the third time. Your
                team sees the history before the refund. Not after.
              </SectionBody>
              <div className="mt-5 flex items-center gap-3 font-mono text-[14px] tracking-[-0.02em] text-black/42">
                <span>1.0</span>
                <span>Gate routing — live</span>
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
