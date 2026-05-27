import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ claimId?: string }>;
}

export default async function CustomerClaimReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  return <ClaimReviewPanel profileId={id} initialClaimId={sp.claimId ?? null} />;
}
