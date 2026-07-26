import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { PERMISSIONS } from '@/lib/permissions';
import {
  authorizeInvestigationRequest,
} from '@/lib/investigations/routeAuth';
import {
  listInvestigationAttachments,
  investigationAttachmentView,
  MAX_INVESTIGATION_ATTACHMENT_BYTES,
  registerInvestigationFile,
  registerInvestigationLink,
} from '@/lib/investigations/attachments';
import { getCaseInvestigation } from '@/lib/investigations/store';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import { TABLES } from '@/lib/supabase/tables';

const linkSchema = z.object({
  external_url: z.string().trim().url().max(2000),
  label: z.string().trim().max(500).nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string; investigationId: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.VIEW_INBOX);
  if (auth.response) return auth.response;
  const { claimId, investigationId } = await params;
  const loaded = await loadClaimForMerchant(auth.service, claimId, auth.ctx.merchantId);
  if (!loaded.claim) return NextResponse.json({ error: 'Support payout case not found' }, { status: 404 });
  const investigation = await getCaseInvestigation(
    auth.service,
    auth.ctx.merchantId,
    claimId,
    investigationId,
  );
  if (!investigation) return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
  const attachments = await listInvestigationAttachments(
    auth.service,
    auth.ctx.merchantId,
    claimId,
    investigationId,
  );
  return NextResponse.json({
    attachments: attachments.map(investigationAttachmentView),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string; investigationId: string }> },
) {
  const auth = await authorizeInvestigationRequest(
    request,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
    { requireWriteFeature: true },
  );
  if (auth.response) return auth.response;
  const { claimId, investigationId } = await params;
  const loaded = await loadClaimForMerchant(auth.service, claimId, auth.ctx.merchantId);
  if (!loaded.claim) return NextResponse.json({ error: 'Support payout case not found' }, { status: 404 });
  const investigation = await getCaseInvestigation(
    auth.service,
    auth.ctx.merchantId,
    claimId,
    investigationId,
  );
  if (!investigation) return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });

  const { data: existing } = await auth.service
    .from(TABLES.CASE_INVESTIGATION_ATTACHMENTS)
    .select('*')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existing) {
    if (
      existing.support_payout_case_id !== claimId
      || existing.investigation_id !== investigationId
    ) {
      return NextResponse.json({ error: 'Idempotency key was used for another attachment.' }, { status: 409 });
    }
    return NextResponse.json({ attachment: existing, replayed: true });
  }

  try {
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    let attachment;
    if (contentType.includes('multipart/form-data')) {
      const declaredLength = Number(request.headers.get('content-length'));
      if (
        Number.isFinite(declaredLength)
        && declaredLength > MAX_INVESTIGATION_ATTACHMENT_BYTES + 1024 * 1024
      ) {
        return NextResponse.json(
          { error: 'File upload exceeds the 10 MB limit.' },
          { status: 413 },
        );
      }
      const formData = await request.formData().catch(() => null);
      const file = formData?.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'An evidence file is required.' }, { status: 400 });
      }
      attachment = await registerInvestigationFile({
        client: auth.mutationClient,
        merchantId: auth.ctx.merchantId,
        caseId: claimId,
        investigationId,
        actorUserId: auth.user.id,
        idempotencyKey,
        file,
      });
    } else {
      const parsed = linkSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: 'A valid HTTPS evidence link is required.' }, { status: 400 });
      }
      attachment = await registerInvestigationLink({
        client: auth.mutationClient,
        merchantId: auth.ctx.merchantId,
        caseId: claimId,
        investigationId,
        actorUserId: auth.user.id,
        idempotencyKey,
        externalUrl: parsed.data.external_url,
        label: parsed.data.label,
      });
    }
    return NextResponse.json(
      {
        attachment: investigationAttachmentView(attachment),
        usable_as_evidence: attachment.safety_status === 'clean',
        message: attachment.safety_status === 'pending'
          ? 'File uploaded to private quarantine. It is not decision evidence until the safety scan passes.'
          : 'Validated reference attached to the investigation evidence.',
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('invalid_file')) return NextResponse.json({ error: 'File is empty, unsupported, or exceeds 10 MB.' }, { status: 413 });
    if (message.includes('magic_mismatch')) return NextResponse.json({ error: 'File contents do not match the declared type.' }, { status: 415 });
    if (message.includes('invalid_url')) return NextResponse.json({ error: 'Only safe public HTTPS references are accepted.' }, { status: 422 });
    return NextResponse.json({ error: 'Failed to attach investigation evidence.' }, { status: 500 });
  }
}
