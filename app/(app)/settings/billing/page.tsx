import { Suspense } from 'react';
import BillingSettingsClient from '@/components/billing/BillingSettingsClient';

export const dynamic = 'force-dynamic';

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={<div className="ua-route-readiness" role="status" aria-label="Loading billing">Loading billing…</div>}>
      <BillingSettingsClient />
    </Suspense>
  );
}
