'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EvidencePackageForm } from '@/components/evidence/EvidencePackageForm';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import { Bone } from '@/components/ui/LoadingSkeleton';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

function ProfileDrawerLink({ profileId, disputedOrder }: { profileId: string; disputedOrder: string }) {
  const href = disputedOrder
    ? `/customers/${profileId}?buildEvidence=1&disputedOrder=${encodeURIComponent(disputedOrder)}`
    : `/customers/${profileId}?buildEvidence=1`;
  return (
    <p className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">
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

function EvidenceNewLoading() {
  return (
    <div>
      <AuthenticatedPageHeader title="Build evidence package" subtitle="Loading customer evidence workspace…" breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: 'Profile' }, { label: 'New evidence' }]} />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel><div className="space-y-4 p-1"><Bone className="h-5 w-52" /><Bone className="h-4 w-full max-w-2xl" /><div className="grid gap-3 border-t border-[var(--ua-border-subtle)] pt-4 sm:grid-cols-2"><Bone className="h-10" /><Bone className="h-10" /></div><Bone className="h-36 w-full" /></div></AuthenticatedPanel>
      </div>
    </div>
  );
}

export default function EvidenceNewPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <Suspense fallback={<EvidenceNewLoading />}>
      <EvidenceNewPageContent profileId={id} />
    </Suspense>
  );
}
