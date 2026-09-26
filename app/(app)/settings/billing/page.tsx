import { Suspense } from 'react';
import BillingSettingsClient from '@/components/billing/BillingSettingsClient';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function BillingSettingsPage() {
  await throwForAcceptanceScenario('billing-error');
  return (
    <Suspense fallback={<div style={{ display: 'grid', minHeight: 220, placeItems: 'center', color: '#64686d' }} role="status" aria-label="Loading billing">Loading billing…</div>}>
      <BillingSettingsClient />
    </Suspense>
  );
}
