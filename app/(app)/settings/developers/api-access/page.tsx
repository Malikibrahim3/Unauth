export const dynamic = 'force-dynamic';

import ApiAccessSettingsPage from './ApiAccessSettingsPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export default async function ApiAccessSettingsRoute() {
  await throwForAcceptanceScenario('api-access-error');
  return <ApiAccessSettingsPage />;
}
