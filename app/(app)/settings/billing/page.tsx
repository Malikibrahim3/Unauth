import { Suspense } from 'react';
import BillingSettingsClient from '@/components/billing/BillingSettingsClient';

export const dynamic = 'force-dynamic';

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[var(--ink-secondary)]">Loading billing…</p>}>
      <BillingSettingsClient />
    </Suspense>
  );
}
