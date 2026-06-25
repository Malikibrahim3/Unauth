'use client';

import MobileCollapse from '@/app/(public)/landing/_components/foundation/MobileCollapse';
import foundationStyles from '@/app/(public)/landing/_components/foundation/foundation.module.css';
import ClaimHistoryTable from './ClaimHistoryTable';

export default function UnauthClaimIntelligenceHero() {
  return (
    <section
      id="claim-intelligence"
      className="relative overflow-hidden border-t border-black/[0.07] bg-white text-[#111111]"
      data-nav-theme="light"
    >
      <Background />

      {/* Desktop / tablet-landscape (≥769px) */}
      <main className="relative z-10 mx-auto hidden max-w-[1180px] px-6 pb-24 pt-20 md:pt-24 min-[769px]:block">
        <SectionIntro />
        <div className="mt-10">
          <ClaimHistoryTable />
        </div>
      </main>

      {/* Mobile (≤768px) */}
      <main className="relative z-10 px-4 pb-20 pt-16 min-[769px]:hidden">
        <MobileCollapse collapsedLabel="See claim history">
          <SectionIntro />
          <div className={foundationStyles.collapseDetails}>
            <div className={foundationStyles.collapseDetailsInner}>
              <div className={`${foundationStyles.artifactRail} mt-8`}>
                <div className={foundationStyles.artifactRailScroll}>
                  <ClaimHistoryTable />
                </div>
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
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-white" />
      <div className="absolute left-1/2 top-[200px] h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-black/[0.038] blur-[110px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(0,0,0,0.048),transparent_54%)]" />
      <div
        className="absolute inset-0 opacity-[0.11] [mask-image:radial-gradient(circle_at_50%_40%,black_0%,transparent_60%)]"
        style={{
          backgroundImage:
            'linear-gradient(to right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to bottom,rgba(0,0,0,0.06)_1px,transparent_1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div className="absolute inset-x-0 top-0 h-[220px] bg-gradient-to-b from-white to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[280px] bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

function SectionIntro() {
  return (
    <div className="mb-10 max-w-[760px]">
      <p className={foundationStyles.landingSectionEyebrow}>CLAIM INTELLIGENCE</p>
      <h2 className={foundationStyles.landingSectionTitle}>
        The claim history your agents never see.
      </h2>
      <p className={`${foundationStyles.landingSectionLead} max-w-[640px]`}>
        Before a single reply goes out, Unauth surfaces every prior payout, pattern flag, and
        exposure amount — so the repeat claimant is visible at the one moment that stops it.
      </p>
    </div>
  );
}
