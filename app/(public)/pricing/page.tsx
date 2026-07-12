import type { Metadata } from 'next';
import FoundationNav from '../landing/_components/foundation/FoundationNav';
import FoundationPricingTiers from '../landing/_components/foundation/FoundationPricingTiers';
import FoundationPricingCredits from '../landing/_components/foundation/FoundationPricingCredits';
import FoundationFooter from '../landing/_components/foundation/FoundationFooter';
import foundationStyles from '../landing/_components/foundation/foundation.module.css';

export const metadata: Metadata = {
  title: 'Pricing | Unauth',
  description:
    'Usage-based pricing for post-purchase payout control, evidence checklists, merchant rules, and recovery workflow. Start free — pay for the operational context you use.',
  openGraph: {
    title: 'Pricing | Unauth',
    description:
      'Pricing for payout control, evidence, merchant rules, and recovery operations inside Gorgias and Shopify.',
  },
};

export default function PricingPage() {
  return (
    <div
      className={`overflow-x-clip bg-[var(--fl-bg)] text-[var(--fl-ink)] ${foundationStyles.landingHeadings}`}
    >
      <FoundationNav />
      <main>
        <FoundationPricingTiers />
        <FoundationPricingCredits />
        <FoundationFooter />
      </main>
    </div>
  );
}
