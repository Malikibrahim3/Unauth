import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';

interface Props { params: Promise<{ id: string }> }

export default async function CustomerClaimReviewPage({ params }: Props) {
  const { id } = await params;
  return <ClaimReviewPanel profileId={id} />;
}
