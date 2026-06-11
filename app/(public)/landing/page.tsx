import type { Metadata } from 'next';
import FoundationNav from './_components/foundation/FoundationNav';
import FoundationHero from './_components/foundation/FoundationHero';
import FoundationHeroCta from './_components/foundation/FoundationHeroCta';
import HeroPin from './_components/foundation/HeroPin';
import FoundationStatement from './_components/foundation/FoundationStatement';
import FoundationSignalsEvidence from './_components/foundation/FoundationSignalsEvidence';
import FoundationHowItWorks from './_components/foundation/FoundationHowItWorks';
import FoundationFigures from './_components/foundation/FoundationFigures';
import FoundationBento from './_components/foundation/FoundationBento';
import FoundationFaq from './_components/foundation/FoundationFaq';
import FoundationFinalCta from './_components/foundation/FoundationFinalCta';
import FoundationFooter from './_components/foundation/FoundationFooter';

export const metadata: Metadata = {
  title: 'Unauth — Every Claim Leaves a Trail',
  description:
    'Cross-merchant identity evidence for post-checkout claim reviews. Unauth attaches graded, review-ready context to claims — hashed signals across participating merchants, decided by your team.',
};

/**
 * Editorial display landing. The hero is pinned (sticky) under the page:
 * everything after it scrolls over it like a curtain while the hero layers
 * drift and dim at their own depths — the reference's signature move.
 */
export default function LandingPage() {
  return (
    <div className="overflow-x-clip bg-[var(--fl-bg)] text-[var(--fl-ink)]">
      <FoundationNav />
      <main>
        <HeroPin>
          <FoundationHero />
        </HeroPin>
        <div className="relative z-10">
          <FoundationHeroCta />
          <FoundationStatement />
          <FoundationSignalsEvidence />
          <FoundationHowItWorks />
          <FoundationFigures />
          <FoundationBento />
          <FoundationFaq />
          <FoundationFinalCta />
          <FoundationFooter />
        </div>
      </main>
    </div>
  );
}
