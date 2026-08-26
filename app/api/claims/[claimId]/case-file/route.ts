import { NextResponse } from 'next/server';
import { loadCaseEvidenceFile } from '@/lib/claims/caseEvidenceFile';
import { PERMISSIONS } from '@/lib/permissions';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.VIEW_INBOX);
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const file = await loadCaseEvidenceFile(auth.service, auth.ctx.merchantId, claimId);
  if (!file) return NextResponse.json({ error: 'Case evidence file not found.' }, { status: 404 });
  return NextResponse.json(file, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
