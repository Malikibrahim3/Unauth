export const dynamic = 'force-dynamic';

import AuditTrailSettingsPage from './AuditTrailSettingsPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export default async function AuditTrailSettingsRoute() {
  await throwForAcceptanceScenario('audit-trail-error');
  return <AuditTrailSettingsPage />;
}
