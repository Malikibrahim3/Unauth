import type { Metadata } from 'next';
import FoundationNav from '../landing/_components/foundation/FoundationNav';
import FoundationPricingHero from '../landing/_components/foundation/FoundationPricingHero';
import FoundationPricingTiers from '../landing/_components/foundation/FoundationPricingTiers';
import FoundationPricingCredits from '../landing/_components/foundation/FoundationPricingCredits';
import FoundationFaq from '../landing/_components/foundation/FoundationFaq';
import FoundationFinalCta from '../landing/_components/foundation/FoundationFinalCta';
import FoundationFooter from '../landing/_components/foundation/FoundationFooter';
import { FL_PRICING_FAQ } from '../landing/_lib/foundationContent';
import foundationStyles from '../landing/_components/foundation/foundation.module.css';

export const metadata: Metadata = {
  title: 'Pricing | Unauth',
  description:
    'Usage-based pricing for cross-merchant claim context, helpdesk evidence, and network intelligence. Start free — pay only for the context you use.',
  openGraph: {
    title: 'Pricing | Unauth',
    description:
      'Usage-based pricing for cross-merchant claim context, helpdesk evidence, and network intelligence.',
  },
};

export default function PricingPage() {
  return (
    <div
      className={`overflow-x-clip bg-[var(--fl-bg)] text-[var(--fl-ink)] ${foundationStyles.landingHeadings}`}
    >
      <FoundationNav />
      <main>
        <FoundationPricingHero />
        <FoundationPricingTiers />
        <FoundationPricingCredits />
        <FoundationFaq
          id="pricing-faq"
          heading={FL_PRICING_FAQ.heading}
          items={FL_PRICING_FAQ.items}
        />
        <FoundationFinalCta />
        <FoundationFooter />
      </main>
    </div>
  );
}
