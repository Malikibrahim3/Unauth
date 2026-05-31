'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EvidencePackageForm } from '@/components/evidence/EvidencePackageForm';

function ProfileDrawerLink({ profileId, disputedOrder }: { profileId: string; disputedOrder: string }) {
  const href = disputedOrder
    ? `/customers/${profileId}?buildEvidence=1&disputedOrder=${encodeURIComponent(disputedOrder)}`
    : `/customers/${profileId}?buildEvidence=1`;
  return (
    <p className="mx-auto max-w-2xl px-8 pb-2 text-caption" style={{ color: 'var(--text-muted)' }}>
      Prefer the profile view?{' '}
      <Link href={href} className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
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
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-8 pt-8 mb-2">
        <Link
          href={`/customers/${profileId}`}
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Back to profile
        </Link>
      </div>
      <ProfileDrawerLink profileId={profileId} disputedOrder={disputedOrder} />
      <EvidencePackageForm profileId={profileId} preselectedOrderId={disputedOrder} showIntro />
    </div>
  );
}

export default function EvidenceNewPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div className="p-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>}>
      <EvidenceNewPageContent profileId={id} />
    </Suspense>
  );
}
