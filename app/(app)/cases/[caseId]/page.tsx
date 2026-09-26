import { notFound, redirect } from 'next/navigation';
import { CaseDetailRoute } from '../CaseDetailRoute';
import { safeInternalReturn } from '@/components/relationships/ConnectedObjectDetail';
import { getRequestUser } from '@/lib/auth/requestContext';
import { acceptanceScenarioFromHeaders, throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';
import { OperationalRouteSkeleton } from '@/components/states/OperationalRouteSkeleton';
import type { CaseDetailAction, CaseDetailTab } from '@/components/claims/CaseDetailOperations';

export const dynamic = 'force-dynamic';

export default async function CaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ tab?: string; investigationId?: string; return?: string; action?: string }>;
}) {
  const acceptanceScenario = await acceptanceScenarioFromHeaders();
  if (acceptanceScenario === 'operational-detail-loading-skeleton') {
    return <OperationalRouteSkeleton title="Loading case detail, evidence, and decision" rows={6} detail />;
  }
  if (acceptanceScenario === 'case-not-found') notFound();
  await throwForAcceptanceScenario('case-error');
  const [{ caseId }, query] = await Promise.all([params, searchParams]);
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const tabAliases: Record<string, CaseDetailTab> = {
    evidence: 'evidence',
    recommendation: 'recommendation',
    responsibility: 'recommendation',
    decisions: 'decisions',
    recovery: 'recovery',
    financial: 'financial',
    audit: 'audit',
    activity: 'audit',
  };
  const initialTab = query.tab ? tabAliases[query.tab] ?? null : null;
  const initialAction = ['decision', 'snooze', 'request-evidence'].includes(query.action ?? '')
    ? query.action as Exclude<CaseDetailAction, null>
    : null;
  return <CaseDetailRoute claimId={caseId} caseBackHref={safeInternalReturn(query.return) ?? '/cases'} initialTab={initialTab} investigationId={query.investigationId ?? null} initialAction={initialAction} />;
}
