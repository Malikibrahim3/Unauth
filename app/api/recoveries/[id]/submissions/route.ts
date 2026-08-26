import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { PERMISSIONS } from '@/lib/permissions';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';

const submissionSchema = z.object({
  channel: z.enum(['manual_portal', 'manual_email', 'manual_other']),
  provider_account_reference: z.string().trim().max(500).nullable().optional(),
  external_claim_reference: z.string().trim().max(500).nullable().optional(),
  external_url: z.string().trim().url().max(2000).nullable().optional().or(z.literal('')),
  amount_sought_minor: z.number().int().min(0).nullable().optional(),
  currency: z.string().trim().max(8).nullable().optional(),
  submitted_at: z.string().datetime({ offset: true }).optional(),
  claim_pack_id: z.string().uuid(),
  receipt_evidence_item_id: z.string().uuid().nullable().optional(),
  receipt_correspondence_id: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(10000).nullable().optional(),
}).superRefine((value, ctx) => {
  if (!value.external_claim_reference && !value.external_url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['external_claim_reference'], message: 'Record a provider reference or URL.' });
  }
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (auth.response) return auth.response;
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  const parsed = submissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid external submission receipt.', issues: parsed.error.flatten() }, { status: 400 });
  const { id } = await params;
  const recoveryCase = await getRecoveryCase(auth.service, auth.ctx.merchantId, id);
  if (!recoveryCase) return NextResponse.json({ error: 'Recovery case not found.' }, { status: 404 });
  const input = parsed.data;
  const { data, error } = await (auth.mutationClient as any).rpc('record_recovery_claim_submission', {
    p_merchant_id: auth.ctx.merchantId,
    p_recovery_case_id: recoveryCase.id,
    p_claim_pack_id: input.claim_pack_id,
    p_channel: input.channel,
    p_provider_account_reference: input.provider_account_reference ?? null,
    p_external_claim_reference: input.external_claim_reference ?? null,
    p_external_url: input.external_url || null,
    p_amount_sought_minor: input.amount_sought_minor ?? recoveryCase.amount_sought_minor,
    p_currency: input.currency?.toUpperCase() ?? recoveryCase.currency,
    p_submitted_at: input.submitted_at ?? new Date().toISOString(),
    p_submitted_by: auth.user.id,
    p_receipt_evidence_item_id: input.receipt_evidence_item_id ?? null,
    p_receipt_correspondence_id: input.receipt_correspondence_id ?? null,
    p_notes: input.notes ?? null,
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '22023' ? 422 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ submission: Array.isArray(data) ? data[0] : data }, { status: 201 });
}
