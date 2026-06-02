import PipelineTabs from './_components/PipelineTabs';
import VerdictTicker from './_components/VerdictTicker';
import LandingReachableModules from './_components/LandingReachableModules';
import { LandingHeaderSection } from './_components/sections/LandingHeaderSection';
import { LandingHeroSection } from './_components/sections/LandingHeroSection';
import { LandingShopifySection } from './_components/sections/LandingShopifySection';
import { LandingPatternSection } from './_components/sections/LandingPatternSection';
import { LandingDataSchemaSection } from './_components/sections/LandingDataSchemaSection';
import { LandingDashboardSection } from './_components/sections/LandingDashboardSection';
import { LandingComparisonSection } from './_components/sections/LandingComparisonSection';
import { LandingFaqSection } from './_components/sections/LandingFaqSection';
import { LandingFooterSection } from './_components/sections/LandingFooterSection';

export const metadata = {
  title: 'Unauth — Fraud Intelligence for Ecommerce',
  description:
    'Find repeat refund abuse and INR rings hiding across stores. Upload a CSV and get a free fraud graph audit.',
};

export default function LandingPage() {
  const todayISO = new Date().toISOString().slice(0, 10);
  return (
    <div className="ua-landing-shell ua-landing-page-root">
      <LandingHeaderSection />
      <LandingHeroSection todayISO={todayISO} />
      <LandingShopifySection />
      <LandingPatternSection />
      <VerdictTicker />
      <PipelineTabs />
      <LandingDataSchemaSection />
      <LandingDashboardSection />
      <LandingComparisonSection />
      <LandingFaqSection />
      <LandingFooterSection todayISO={todayISO} />
      <LandingReachableModules enabled={false} />
    </div>
  );
}
