'use client';

import { Suspense, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { EvidencePackageForm } from '@/components/evidence/EvidencePackageForm';
import { ButtonLink, PageFrame } from '@/components/ui';
import { Bone } from '@/components/ui/LoadingSkeleton';

interface PageProps {
  params: Promise<{ id: string }>;
}

function EvidenceNewPageContent({ profileId }: { profileId: string }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') ?? searchParams.get('disputedOrder') ?? '';
  const caseId = searchParams.get('caseId') ?? '';

  return (
    <PageFrame
      title="Build an evidence package"
      subtitle="Assemble a case-ready bundle from the order, the claim, the source records that exist, and an explicit statement of the ones that do not."
      breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: 'Customer', href: `/customers/${profileId}` }, { label: 'New evidence package' }]}
      showCurrentBreadcrumb
      actions={<ButtonLink href={`/customers/${profileId}`} variant="secondary" size="sm">Back to customer</ButtonLink>}
      tabs={<nav className="uo-mini-tabs" aria-label="Evidence package steps"><a href="#select-order" aria-current="step">1 · Select order</a><a href="#review-evidence">2 · Review evidence</a><a href="#package-summary">3 · Confirm package</a></nav>}
      surfaceId="build-evidence-package"
      archetype="P8"
    >
      <EvidencePackageForm profileId={profileId} preselectedOrderId={orderId} caseContextId={caseId} syncOrderToUrl showIntro />
    </PageFrame>
  );
}

function EvidenceNewLoading() {
  return (
    <PageFrame title="Build an evidence package" subtitle="Loading customer evidence workspace…" breadcrumbs={[{ label: 'Customers', href: '/customers' }, { label: 'Customer' }, { label: 'New evidence package' }]} surfaceId="build-evidence-package" archetype="P8">
      <div data-state-id="evidence-package-builder-loading" className="uo-card p-4"><div className="space-y-4"><Bone className="h-5 w-52" /><Bone className="h-4 w-full max-w-2xl" /><div className="grid gap-3 border-t border-[var(--uo-route-border-subtle)] pt-4 sm:grid-cols-2"><Bone className="h-10" /><Bone className="h-10" /></div><Bone className="h-36 w-full" /></div></div>
    </PageFrame>
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
