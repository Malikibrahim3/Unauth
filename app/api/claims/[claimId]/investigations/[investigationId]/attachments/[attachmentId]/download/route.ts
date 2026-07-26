import { NextResponse } from 'next/server';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      claimId: string;
      investigationId: string;
      attachmentId: string;
    }>;
  },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.VIEW_INBOX);
  if (auth.response) return auth.response;
  const { claimId, investigationId, attachmentId } = await params;
  const loaded = await loadClaimForMerchant(
    auth.service,
    claimId,
    auth.ctx.merchantId,
  );
  if (!loaded.claim) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: 404 },
    );
  }
  const { data: attachment, error } = await auth.service
    .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
    .select('id,file_path,safety_status')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('support_payout_case_id', claimId)
    .eq('investigation_id', investigationId)
    .eq('id', attachmentId)
    .maybeSingle();
  if (error || !attachment) {
    return NextResponse.json(
      { error: 'Investigation attachment not found' },
      { status: 404 },
    );
  }
  if (attachment.safety_status !== 'clean' || !attachment.file_path) {
    return NextResponse.json(
      { error: 'This file is quarantined and cannot be downloaded.' },
      { status: 423 },
    );
  }
  const { data, error: signedError } = await auth.service.storage
    .from(STORAGE_BUCKETS.INVESTIGATION_EVIDENCE)
    .createSignedUrl(attachment.file_path, 60);
  if (signedError || !data?.signedUrl) {
    return NextResponse.json(
      { error: 'Unable to issue a protected download link.' },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { url: data.signedUrl, expires_in: 60 },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}
