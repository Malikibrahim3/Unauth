import type { Metadata } from 'next';
import FoundationNav from './_components/foundation/FoundationNav';
import FoundationHero from './_components/foundation/FoundationHero';
import FoundationHero2 from './_components/foundation/FoundationHero2';
import {
  ClaimGateHero,
} from './_components/OutcomeLandingBody';
import FoundationFinalCta from './_components/foundation/FoundationFinalCta';
import FoundationFooter from './_components/foundation/FoundationFooter';
import dynamic from 'next/dynamic';
import foundationStyles from './_components/foundation/foundation.module.css';

const UnauthLinearClaimHero = dynamic(() => import('@/components/UnauthLinearClaimHero'));

export const metadata: Metadata = {
  title: 'Unauth — Post-Purchase Loss Recovery',
  description:
    'Unauth catches every claim before it is paid, attributes the loss to whoever owns it, and hands your team the recovery case ready to file.',
  openGraph: {
    title: 'Unauth — Post-Purchase Loss Recovery',
    description:
      'Unauth catches every claim before it is paid, attributes the loss to whoever owns it, and hands your team the recovery case ready to file.',
  },
  twitter: {
    title: 'Unauth — Post-Purchase Loss Recovery',
    description:
      'Unauth catches every claim before it is paid, attributes the loss to whoever owns it, and hands your team the recovery case ready to file.',
  },
};

export default function LandingPage() {
  return (
    <div className={`overflow-x-clip bg-[var(--fl-bg)] text-[var(--fl-ink)] ${foundationStyles.landingHeadings}`}>
      <FoundationNav />
      <main>
        <FoundationHero />
        <FoundationHero2 />
        <div className="relative z-10 bg-white">
          <ClaimGateHero />
          <UnauthLinearClaimHero />
          <FoundationFinalCta />
          <FoundationFooter />
        </div>
      </main>
    </div>
  );
}
