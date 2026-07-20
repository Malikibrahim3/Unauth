import { Suspense } from 'react';
import BillingSettingsClient from '@/components/billing/BillingSettingsClient';
import { FormPageLoadingSkeleton } from '@/components/navigation/skeletons/pageSkeletons';

export const dynamic = 'force-dynamic';

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={<FormPageLoadingSkeleton />}>
      <BillingSettingsClient />
    </Suspense>
  );
}
