export const dynamic = 'force-dynamic';

import PlatformSettingsPage from './PlatformSettingsPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export default async function PlatformSettingsRoute() {
  await throwForAcceptanceScenario('platform-settings-error');
  return <PlatformSettingsPage />;
}
