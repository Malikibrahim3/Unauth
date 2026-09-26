export const dynamic = 'force-dynamic';

import DataPrivacySettingsPage from './DataPrivacySettingsPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export default async function DataPrivacySettingsRoute() {
  await throwForAcceptanceScenario('privacy-error');
  return <DataPrivacySettingsPage />;
}
