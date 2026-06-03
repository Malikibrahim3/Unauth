import PipelineTabs from './_components/PipelineTabs';
import { LandingHeaderSection } from './_components/sections/LandingHeaderSection';
import { LandingHeroSection } from './_components/sections/LandingHeroSection';
import { LandingTrustStrip } from './_components/sections/LandingTrustStrip';
import { LandingIntegrationsSection } from './_components/sections/LandingIntegrationsSection';
import {
  LandingProductTierSection,
  LandingPricingSection,
} from './_components/sections/LandingProductTierSection';
import { LandingNetworkSection } from './_components/sections/LandingNetworkSection';
import { LandingDataSchemaSection } from './_components/sections/LandingDataSchemaSection';
import { LandingDashboardSection } from './_components/sections/LandingDashboardSection';
import { LandingComparisonSection } from './_components/sections/LandingComparisonSection';
import { LandingFaqSection } from './_components/sections/LandingFaqSection';
import { LandingFooterSection } from './_components/sections/LandingFooterSection';

export const metadata = {
  title: 'Unauth — Live Claim Intelligence for Ecommerce Teams',
  description:
    'Connect your store and helpdesk to know which claims to trust, review, or challenge. Unauth syncs orders, refunds, chargebacks, and support context into one merchant-controlled workspace. CSV import stays available for historical backfill.',
};

export default function LandingPage() {
  const todayISO = new Date().toISOString().slice(0, 10);
  return (
    <div className="ua-landing-shell ua-landing-page-root">
      <LandingHeaderSection />
      <LandingHeroSection todayISO={todayISO} />
      <LandingTrustStrip />
      <LandingIntegrationsSection />
      <LandingProductTierSection />
      <PipelineTabs />
      <LandingDashboardSection />
      <LandingNetworkSection />
      <LandingDataSchemaSection />
      <LandingPricingSection />
      <LandingComparisonSection />
      <LandingFaqSection />
      <LandingFooterSection todayISO={todayISO} />
    </div>
  );
}
