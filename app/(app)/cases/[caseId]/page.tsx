import { CaseDetailRoute } from '@/app/(app)/claims/CaseDetailRoute';

export const dynamic = 'force-dynamic';

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  return <CaseDetailRoute claimId={caseId} caseBasePath="/cases" />;
}
