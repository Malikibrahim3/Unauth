'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EvidencePackageForm } from '@/components/evidence/EvidencePackageForm';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

function ProfileDrawerLink({ profileId, disputedOrder }: { profileId: string; disputedOrder: string }) {
  const href = disputedOrder
    ? `/customers/${profileId}?buildEvidence=1&disputedOrder=${encodeURIComponent(disputedOrder)}`
    : `/customers/${profileId}?buildEvidence=1`;
  return (
    <p className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)]">
      Prefer the profile view?{' '}
      <Link href={href} className="font-semibold hover:underline" style={{ color: 'var(--ua-action-primary)' }}>
        Open as a side panel on the customer profile
      </Link>
    </p>
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

function EvidenceNewPageContent({ profileId }: { profileId: string }) {
  const searchParams = useSearchParams();
  const disputedOrder = searchParams.get('disputedOrder') ?? '';

  return (
    <div>
      <AuthenticatedPageHeader
        title="Build evidence package"
        subtitle="Collect merchant-owned records and prepare a reviewable case package."
        breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: 'Profile', href: `/customers/${profileId}` }, { label: 'New evidence' }]}
        actions={<ProfileDrawerLink profileId={profileId} disputedOrder={disputedOrder} />}
      />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel>
          <EvidencePackageForm profileId={profileId} preselectedOrderId={disputedOrder} showIntro />
        </AuthenticatedPanel>
      </div>
    </div>
  );
}

export default function EvidenceNewPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="p-5 text-xs text-[var(--ua-text-secondary)]">Loading…</div>}>
      <EvidenceNewPageContent profileId={id} />
    </Suspense>
  );
}
