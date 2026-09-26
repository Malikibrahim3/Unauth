'use client';

import { useFetchJson } from '@/lib/react/useFetchJson';
import { BILLABLE_EVENTS } from '@/lib/billing/plans';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EvidencePackageForm } from '@/components/evidence/EvidencePackageForm';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import CustomerEvidenceLoading from './loading';

function EvidenceNewPageBody({ profileId, acceptanceState }: { profileId: string; acceptanceState: 'no-orders' | 'no-cases' | null }) {
  const searchParams = useSearchParams();
  const { data: customer, error: identityError, loading: identityLoading } = useFetchJson<{ profile: { id: string; names: string[]; primary_email: string | null } }>(`/api/customers/${profileId}`, {
    parse: async response => {
      if (!response.ok) throw new Error('Customer identity unavailable');
      const body = await response.json();
      if (body.profile?.id !== profileId) throw new Error('Customer identity does not match this route');
      return body;
    },
  });
  const customerName = !identityError && customer?.profile.id === profileId ? customer.profile.names?.[0] || customer.profile.primary_email || 'Unnamed customer' : identityLoading ? 'Loading customer…' : 'Customer identity unavailable';
  const orderId = searchParams.get('orderId') ?? searchParams.get('disputedOrder') ?? '';
  const caseId = searchParams.get('caseId') ?? '';
  return (
    <>
      <SetBreadcrumbLabel label="New evidence package" parent={{ label: customerName, href: `/customers/${profileId}` }} detail="nothing is included unless the retained package builder includes it" />
      <div style={{ height: 54, flex: 'none', padding: '0 22px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #eae8e5' }}>
        <span style={{ color: '#64686d', font: "400 12.5px/1.5 'Inter',sans-serif" }}>Choose the disputed order, then review item by item what a carrier or card network is allowed to see.</span>
        <div style={{ flex: 1 }} />
        <button type="button" aria-disabled="true" title="Durable evidence-package drafts are not part of the current product contract" style={{ padding: '6px 10px', border: 0, borderRadius: 9, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif" }}>Save as a draft</button>
        <button form="evidence-package-form" type="submit" style={{ padding: '6px 11px', border: 0, borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", cursor: 'pointer' }}>Build the package · {BILLABLE_EVENTS['evidence.summary'].credits} credits</button>
      </div>
      <div data-screen-label="Evidence package" data-visual-world="supplied-package" data-surface-id="build-evidence-package" data-archetype="P8" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <EvidencePackageForm profileId={profileId} preselectedOrderId={orderId} caseContextId={caseId} syncOrderToUrl showIntro acceptanceState={acceptanceState ?? undefined} />
      </div>
    </>
  );
}

export function EvidenceNewPageContent({ profileId, acceptanceState }: { profileId: string; acceptanceState: 'no-orders' | 'no-cases' | null }) {
  return <Suspense fallback={<CustomerEvidenceLoading />}><EvidenceNewPageBody key={profileId} profileId={profileId} acceptanceState={acceptanceState} /></Suspense>;
}
