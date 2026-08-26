import type { Metadata } from 'next';
import { Challenge6Pricing } from '@/components/public/Challenge6PublicPages';

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

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  return <Challenge6Pricing requestedPlan={params?.plan} />;
}
