import { notFound, redirect } from 'next/navigation';
import RecoveriesPage from '../RecoveryPage';
import { FileClaimOverlay } from '@/components/recoveries/FileClaimOverlay';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { loadCaseEvidenceFile } from '@/lib/claims/caseEvidenceFile';

export const dynamic = 'force-dynamic';

export default async function FileClaimPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const params = await searchParams;
  const rawCaseId = Array.isArray(params.case) ? params.case[0] : params.case;
  const caseId = rawCaseId?.trim() ?? '';
  if (!caseId) redirect('/financials/recovery');
  const serviceClient = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/overview');
  const [file, canManage] = await Promise.all([
    loadCaseEvidenceFile(serviceClient, ctx.merchantId, caseId),
    hasPermission(serviceClient, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
  ]);
  if (!file) notFound();
  const boardParams = { ...params };
  delete boardParams.case;
  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', overflow: 'hidden' }}>
      <RecoveriesPage searchParams={Promise.resolve(boardParams)}/>
      <FileClaimOverlay file={file} canManage={canManage}/>
    </div>
  );
}
