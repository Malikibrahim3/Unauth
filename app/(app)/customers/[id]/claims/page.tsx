import { redirect } from 'next/navigation';
import {
  preservedRedirectTarget,
  type RedirectSearchParams,
} from '@/lib/navigation/preservedRedirect';

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<RedirectSearchParams & { claimId?: string }>;
}

export default async function CustomerClaimReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const claimId = sp.claimId ?? null;

  if (claimId) {
    redirect(
      preservedRedirectTarget(`/cases/${claimId}`, sp, {
        consume: ['claimId'],
      }),
    );
  }
  redirect(preservedRedirectTarget(`/customers/${id}`, sp, { hash: 'cases' }));
}
