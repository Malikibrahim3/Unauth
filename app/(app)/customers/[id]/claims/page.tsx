import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ claimId?: string }>;
}

export default async function CustomerClaimReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const claimId = sp.claimId ?? null;

  if (claimId) {
    redirect(`/claims/${claimId}`);
  }
  redirect(`/customers/${id}#cases`);
}
