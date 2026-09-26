export const dynamic = 'force-dynamic';

import NotificationsSettingsPage from './NotificationsSettingsPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export default async function NotificationsSettingsRoute() {
  await throwForAcceptanceScenario('notification-settings-error');
  return <NotificationsSettingsPage />;
}
