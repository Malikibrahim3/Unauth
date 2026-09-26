export const dynamic = 'force-dynamic';

import AgreementsSettingsPage from './AgreementsSettingsPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export default async function AgreementsSettingsRoute() {
  await throwForAcceptanceScenario('agreements-error');
  return <AgreementsSettingsPage />;
}
