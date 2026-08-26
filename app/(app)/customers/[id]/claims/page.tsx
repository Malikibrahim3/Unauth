import { redirect } from 'next/navigation';
import {
  preservedRedirectTarget,
  safeUuidRedirectSegment,
  type RedirectSearchParams,
} from '@/lib/navigation/preservedRedirect';

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<RedirectSearchParams>;
}

export default async function CustomerClaimReviewPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const customerPath = `/customers/${encodeURIComponent(id)}`;
  const claimId = safeUuidRedirectSegment(sp.claimId);

  if (claimId) {
    redirect(
      preservedRedirectTarget(`/cases/${claimId}`, sp, {
        consume: ['claimId'],
        force: { return: `${customerPath}?tab=cases` },
      }),
    );
  }
  redirect(
    preservedRedirectTarget(customerPath, sp, {
      consume: ['claimId', 'return'],
      force: { tab: 'cases' },
    }),
  );
}
