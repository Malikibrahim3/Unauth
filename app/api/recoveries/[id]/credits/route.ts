import { NextResponse } from 'next/server';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import { recordProviderCredit } from '@/lib/reconciliation/providerCredits';
import { TABLES } from '@/lib/supabase/tables';
import { PERMISSIONS } from '@/lib/permissions';
import type { SupabaseClient } from '@supabase/supabase-js';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

const CREDIT_TYPES = ['credit', 'refund', 'settlement', 'adjustment', 'reversal'] as const;
type CreditType = (typeof CREDIT_TYPES)[number];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.VIEW_INBOX);
  if (auth.response) return auth.response;
  const { id } = await params;
  const recovery = await auth.service
    .from(TABLES.RECOVERY_CASES)
    .select('id,support_payout_case_id')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('id', id)
    .maybeSingle();
  if (!recovery.data) return NextResponse.json({ error: 'Recovery case not found' }, { status: 404 });
  const { data, error } = await auth.service
    .from(TABLES.PROVIDER_CREDIT_RECORDS)
    .select('*')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('recovery_case_id', id)
    .order('occurred_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Could not load provider credits.' }, { status: 500 });
  const creditIds = (data ?? []).map((row: { id: string }) => row.id);
  const eventsClient = auth.service as unknown as SupabaseClient;
  const events = creditIds.length
    ? await eventsClient
      .from(TABLES.PROVIDER_CREDIT_EVENTS)
      .select('*')
      .eq('merchant_id', auth.ctx.merchantId)
      .in('provider_credit_record_id', creditIds)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    : { data: [], error: null };
  if (events.error) return NextResponse.json({ error: 'Could not load provider credit history.' }, { status: 500 });
  return NextResponse.json({ provider_credits: data ?? [], events: events.data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (auth.response) return auth.response;
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  const { id } = await params;
  const recovery = await auth.service
    .from(TABLES.RECOVERY_CASES)
    .select('id,support_payout_case_id')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('id', id)
    .maybeSingle();
  if (!recovery.data) return NextResponse.json({ error: 'Recovery case not found' }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const provider = text(body?.provider);
  const externalCreditId = text(body?.external_credit_id);
  const currency = text(body?.currency);
  const creditType = text(body?.credit_type) as CreditType | null;
  const amountMinor = Number(body?.amount_minor);
  const evidenceItemId = text(body?.evidence_item_id);
  const reason = text(body?.reason);
  if (!provider || !externalCreditId || !currency || !Number.isInteger(amountMinor) || amountMinor < 0) {
    return NextResponse.json({ error: 'provider, external_credit_id, currency, and a non-negative amount_minor are required.' }, { status: 400 });
  }
  if (creditType && !CREDIT_TYPES.includes(creditType)) {
    return NextResponse.json({ error: 'credit_type must be credit, refund, settlement, adjustment, or reversal.' }, { status: 400 });
  }
  if (!evidenceItemId || !reason) {
    return NextResponse.json({ error: 'A receipt evidence_item_id and evidence reason are required for a manual credit record.' }, { status: 400 });
  }
  try {
    const result = await recordProviderCredit(auth.mutationClient, auth.ctx.merchantId, {
      provider,
      externalCreditId,
      externalClaimId: text(body?.external_claim_id),
      externalOrderRef: text(body?.external_order_ref),
      externalShipmentRef: text(body?.external_shipment_ref),
      creditType: creditType ?? 'credit',
      amountMinor,
      currency,
      occurredAt: text(body?.occurred_at),
      observedAt: new Date().toISOString(),
      observationAuthority: 'receipt_backed_manual',
      evidenceItemId,
      sourceRecordId: text(body?.source_record_id),
      recoveryCaseId: id,
      supportPayoutCaseId: recovery.data.support_payout_case_id,
      reversesCreditId: text(body?.reverses_credit_id),
      actorUserId: auth.user.id,
      reason,
      idempotencyKey,
      metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata as Record<string, unknown> : {},
    });
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    console.error('[recoveries.credits] failed', error);
    return NextResponse.json({ error: 'Could not record provider credit.' }, { status: 500 });
  }
}
