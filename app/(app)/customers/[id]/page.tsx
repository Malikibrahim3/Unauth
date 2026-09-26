import { CustomerProfileBlockedView, CustomerProfilePageView } from '@/app/(app)/customers/[id]/CustomerProfilePageView';
import {
  loadCustomerProfilePage,
  type CustomerProfileSearchParams,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';
import { notFound } from 'next/navigation';
import { acceptanceScenarioFromHeaders, delayForAcceptanceScenario, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<CustomerProfileSearchParams>;
}

export default async function CustomerProfilePage({ params, searchParams }: PageProps) {
  const acceptanceScenario = await acceptanceScenarioFromHeaders();
  await delayForAcceptanceScenario('operational-detail-loading-skeleton', 5_000);
  await throwForAcceptanceScenario('customer-error');
  if (acceptanceScenario === 'customer-not-found') notFound();
  if (acceptanceScenario === 'customer-profile-access-blocked-state') {
    return <CustomerProfileBlockedView reason="access_denied" />;
  }
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);

  const result = await loadCustomerProfilePage(resolvedParams.id, resolvedSearchParams);

  if (result.blocked) {
    return <CustomerProfileBlockedView reason={result.reason} />;
  }

  return <CustomerProfilePageView {...result.props} />;
}
