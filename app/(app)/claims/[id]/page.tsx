import { CaseDetailRoute } from '@/app/(app)/claims/CaseDetailRoute';

export const dynamic = 'force-dynamic';

export default async function SupportPayoutCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseDetailRoute claimId={id} />;
}
