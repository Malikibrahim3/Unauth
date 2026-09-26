import type { Metadata } from 'next';
import { parseRequestedPlanId } from '@/lib/billing/plans';
import PublicPricing from '@/components/public/PublicPricing';

export const metadata: Metadata = {
  title: 'Pricing | Unauth',
  description:
    'Compare Core, Scale and Enterprise plans for evidence-backed merchant operations, with monthly and annual payment options.',
  openGraph: {
    title: 'Pricing | Unauth',
    description:
      'Core and Scale include annual payment savings. Enterprise terms are agreed for your operation.',
  },
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const rawPlan = (await searchParams).plan;
  const requestedPlan = Array.isArray(rawPlan) ? rawPlan[0] : rawPlan;
  const requestedPlanUnavailable = Boolean(requestedPlan?.trim()) && parseRequestedPlanId(requestedPlan) === null;
  return <PublicPricing requestedPlanUnavailable={requestedPlanUnavailable} />;
}
