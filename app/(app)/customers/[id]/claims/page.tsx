import ClaimReviewPanel from '@/components/claims/ClaimReviewPanel';

interface Props { params: Promise<{ id: string }>; searchParams: Promise<{ shop?: string }> }

export default async function CustomerClaimReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { shop } = await searchParams;
  return <ClaimReviewPanel profileId={id} shopDomain={shop ?? ''} />;
}
