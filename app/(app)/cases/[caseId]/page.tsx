import { redirect } from 'next/navigation';
import { CaseDetailRoute } from '../CaseDetailRoute';
import { safeInternalReturn } from '@/components/relationships/ConnectedObjectDetail';
import { getRequestUser } from '@/lib/auth/requestContext';

export const dynamic = 'force-dynamic';

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ tab?: string; investigationId?: string; return?: string }>;
}) {
  const [{ caseId }, query] = await Promise.all([params, searchParams]);
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const initialTab = ['evidence', 'responsibility', 'recovery', 'activity'].includes(query.tab ?? '')
    ? query.tab as 'evidence' | 'responsibility' | 'recovery' | 'activity'
    : null;
  return <CaseDetailRoute claimId={caseId} caseBackHref={safeInternalReturn(query.return) ?? '/cases'} initialTab={initialTab} investigationId={query.investigationId ?? null} />;
}
