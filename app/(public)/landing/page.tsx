import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import FoundationNav from './_components/foundation/FoundationNav';
import FoundationHero from './_components/foundation/FoundationHero';
import HeroPin from './_components/foundation/HeroPin';
import FoundationFinalCta from './_components/foundation/FoundationFinalCta';
import FoundationFooter from './_components/foundation/FoundationFooter';
import foundationStyles from './_components/foundation/foundation.module.css';

const UnauthNetworkHero = dynamic(
  () => import('@/components/UnauthNetworkHero').then((mod) => mod.UnauthNetworkHero),
);
const UnauthGlobeHero = dynamic(
  () => import('@/components/UnauthGlobeHero').then((mod) => mod.UnauthGlobeHero),
);
const UnauthLinearClaimHero = dynamic(() => import('@/components/UnauthLinearClaimHero'));
const EvidenceNotVerdictsRampSection = dynamic(
  () => import('@/components/EvidenceNotVerdictsRampSection'),
);
const BuiltForPurposeStack = dynamic(() => import('@/components/BuiltForPurposeStack'));
const UnauthClaimsRoadmapSection = dynamic(() => import('@/components/UnauthClaimsRoadmapSection'));

export const metadata: Metadata = {
  title: 'Unauth — Claim Decision Infrastructure for Helpdesk Reviews',
  description:
    'Unauth turns helpdesk claims into explainable, merchant-owned decisions — order, delivery, identity, evidence, rules, and audit trail inside Gorgias, Zendesk, and Freshdesk.',
  openGraph: {
    title: 'Unauth — Claim Decision Infrastructure for Helpdesk Reviews',
    description:
      'Unauth turns helpdesk claims into explainable, merchant-owned decisions — order, delivery, identity, evidence, rules, and audit trail inside Gorgias, Zendesk, and Freshdesk.',
  },
  twitter: {
    title: 'Unauth — Claim Decision Infrastructure for Helpdesk Reviews',
    description:
      'Unauth turns helpdesk claims into explainable, merchant-owned decisions — order, delivery, identity, evidence, rules, and audit trail inside Gorgias, Zendesk, and Freshdesk.',
  },
};

/**
 * Editorial display landing. The hero is pinned (sticky) under the page:
 * everything after it scrolls over it like a curtain while the hero layers
 * drift and dim at their own depths — the reference's signature move.
 */
export default function LandingPage() {
  return (
    <div className={`overflow-x-clip bg-[var(--fl-bg)] text-[var(--fl-ink)] ${foundationStyles.landingHeadings}`}>
      <FoundationNav />
      <main>
        <HeroPin>
          <FoundationHero />
        </HeroPin>
        <div className="relative z-10 bg-white">
          <UnauthNetworkHero />
          <UnauthGlobeHero />
          <UnauthLinearClaimHero />
          <EvidenceNotVerdictsRampSection />
          <BuiltForPurposeStack />
          <UnauthClaimsRoadmapSection />
          <FoundationFinalCta />
          <FoundationFooter />
        </div>
      </main>
    </div>
  );
}
