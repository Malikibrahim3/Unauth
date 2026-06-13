import type { Metadata } from 'next';
import FoundationNav from './_components/foundation/FoundationNav';
import FoundationHero from './_components/foundation/FoundationHero';
import HeroPin from './_components/foundation/HeroPin';
import EvidenceNotVerdictsHero from '@/components/sections/EvidenceNotVerdictsHero';
import FoundationStatement from './_components/foundation/FoundationStatement';
import FoundationSignalsEvidence from './_components/foundation/FoundationSignalsEvidence';
import FoundationHowItWorks from './_components/foundation/FoundationHowItWorks';
import FoundationFigures from './_components/foundation/FoundationFigures';
import FoundationBento from './_components/foundation/FoundationBento';
import FoundationFaq from './_components/foundation/FoundationFaq';
import FoundationFinalCta from './_components/foundation/FoundationFinalCta';
import FoundationFooter from './_components/foundation/FoundationFooter';

export const metadata: Metadata = {
  title: 'Unauth — Cross-Merchant Claim Evidence',
  description:
    'Cross-merchant identity evidence for post-checkout claim reviews. Unauth attaches graded context to claims — decided by your team.',
  openGraph: {
    title: 'Unauth — Cross-Merchant Claim Evidence',
    description:
      'Cross-merchant identity evidence for post-checkout claim reviews. Unauth attaches graded context to claims — decided by your team.',
  },
  twitter: {
    title: 'Unauth — Cross-Merchant Claim Evidence',
    description:
      'Cross-merchant identity evidence for post-checkout claim reviews. Unauth attaches graded context to claims — decided by your team.',
  },
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
          <EvidenceNotVerdictsHero />
          <FoundationStatement />
          <FoundationBento />
          <FoundationSignalsEvidence />
          <FoundationHowItWorks />
          <FoundationFigures />
          <FoundationFaq />
          <FoundationFinalCta />
          <FoundationFooter />
        </div>
      </main>
    </div>
  );
}
