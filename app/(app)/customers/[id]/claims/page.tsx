import { redirect } from 'next/navigation';
import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ claimId?: string }>;
}

export default async function CustomerClaimReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const claimId = sp.claimId ?? null;

  // Case review now lives at the first-class /claims/[id] route. This
  // customer-scoped path is kept as a compatibility redirect for existing
  // links/bookmarks; the no-claim path still hosts the new-case creation flow.
  if (claimId) {
    redirect(`/claims/${claimId}`);
  }

  return <ClaimReviewPanel profileId={id} sourceCustomerId={id} initialClaimId={claimId} />;
}
