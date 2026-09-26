import ShipBobAccountSelectionClient from './ShipBobAccountSelectionClient';
import { safeRedirectPath } from '@/lib/auth/safeRedirect';
import { acceptanceScenarioFromHeaders } from '@/lib/testing/acceptanceStateInjector';

export default async function ShipBobAccountSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{ selection?: string; returnTo?: string }>;
}) {
  const { selection = '', returnTo: requestedReturnTo } = await searchParams;
  const returnTo = safeRedirectPath(requestedReturnTo ?? '/sources/shipbob');
  const acceptanceScenario = await acceptanceScenarioFromHeaders();
  const acceptanceState = acceptanceScenario === 'shipbob-selection-empty' ? 'empty' : null;
  return <ShipBobAccountSelectionClient selectionId={selection} returnTo={returnTo} acceptanceState={acceptanceState} />;
}
