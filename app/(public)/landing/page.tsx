import type { Metadata } from 'next';
import FoundationNav from './_components/foundation/FoundationNav';
import FoundationHero from './_components/foundation/FoundationHero';
import FoundationHero2 from './_components/foundation/FoundationHero2';
import FoundationFinalCta from './_components/foundation/FoundationFinalCta';
import FoundationFooter from './_components/foundation/FoundationFooter';
import foundationStyles from './_components/foundation/foundation.module.css';

export const metadata: Metadata = {
  title: 'Unauth — Post-Purchase Loss Recovery',
  description:
    'Unauth brings order, delivery, support, and financial context into one merchant-controlled case with an auditable recovery timeline.',
  openGraph: {
    title: 'Unauth — Post-Purchase Loss Recovery',
    description:
      'Unauth brings order, delivery, support, and financial context into one merchant-controlled case with an auditable recovery timeline.',
  },
  twitter: {
    title: 'Unauth — Post-Purchase Loss Recovery',
    description:
      'Unauth brings order, delivery, support, and financial context into one merchant-controlled case with an auditable recovery timeline.',
  },
};

export default function LandingPage() {
  return (
    <div className={`overflow-x-clip bg-[var(--fl-bg)] text-[var(--fl-ink)] ${foundationStyles.landingHeadings}`}>
      <FoundationNav />
      <main>
        <FoundationHero />
        <FoundationHero2 />
        <div className="relative z-10 bg-[var(--fl-bg)]">
          <FoundationFinalCta />
          <FoundationFooter />
        </div>
      </main>
    </div>
  );
}
