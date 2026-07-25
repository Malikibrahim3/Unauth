import { NextResponse } from 'next/server';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import { TABLES } from '@/lib/supabase/tables';
import { PERMISSIONS } from '@/lib/permissions';

const STAGES = [
  'prepared',
  'sent',
  'acknowledged',
  'approved',
  'credited',
  'reconciled',
  'closed_unrecoverable',
] as const;
type ProviderClaimStage = (typeof STAGES)[number];

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
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
    .select('id,provider_claim_stage')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('id', id)
    .maybeSingle();
  if (!recovery.data) return NextResponse.json({ error: 'Recovery case not found' }, { status: 404 });

  const priorEvent = await auth.service
    .from(TABLES.RECOVERY_CASE_EVENTS)
    .select('id,recovery_case_id')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (priorEvent.error) return NextResponse.json({ error: 'Could not check the stage transition history.' }, { status: 500 });
  if (priorEvent.data) {
    if (priorEvent.data.recovery_case_id !== id) {
      return NextResponse.json({ error: 'This Idempotency-Key was already used for another recovery case.' }, { status: 409 });
    }
    return NextResponse.json({ recovery_case: recovery.data, event_id: priorEvent.data.id, replayed: true });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const stage = text(body?.provider_claim_stage) as ProviderClaimStage | null;
  const expectedStage = text(body?.expected_stage) as ProviderClaimStage | null;
  const note = text(body?.note);
  if (!stage || !STAGES.includes(stage)) return NextResponse.json({ error: 'Invalid provider claim stage.' }, { status: 400 });
  if (expectedStage && recovery.data.provider_claim_stage !== expectedStage) {
    return NextResponse.json({ error: 'The provider claim changed. Refresh before updating its stage.', code: 'stage_conflict' }, { status: 409 });
  }
  const currentStage = recovery.data.provider_claim_stage as ProviderClaimStage;
  if (STAGES.indexOf(stage) < STAGES.indexOf(currentStage)) {
    return NextResponse.json({ error: 'Provider claim stages are forward-only.', code: 'stage_regression' }, { status: 422 });
  }
  if (stage === 'closed_unrecoverable' && !note) {
    return NextResponse.json({ error: 'A note is required when closing recovery as unrecoverable.' }, { status: 422 });
  }

  const updated = await auth.mutationClient
    .from(TABLES.RECOVERY_CASES)
    .update({ provider_claim_stage: stage })
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('id', id)
    .eq('provider_claim_stage', recovery.data.provider_claim_stage)
    .select('id,provider_claim_stage,updated_at')
    .maybeSingle();
  if (updated.error) return NextResponse.json({ error: 'Could not update provider claim stage.' }, { status: 500 });
  if (!updated.data) return NextResponse.json({ error: 'The provider claim changed. Refresh before updating its stage.', code: 'stage_conflict' }, { status: 409 });

  const event = await auth.mutationClient
    .from(TABLES.RECOVERY_CASE_EVENTS)
    .insert({
      merchant_id: auth.ctx.merchantId,
      recovery_case_id: id,
      event_type: 'status_changed',
      note: note ?? `Provider claim stage changed to ${stage}.`,
      metadata: {
        provider_claim_stage_from: recovery.data.provider_claim_stage,
        provider_claim_stage_to: stage,
        idempotency_key: idempotencyKey,
        actor_user_id: auth.user.id,
      },
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .maybeSingle();
  if (event.error) return NextResponse.json({ error: 'Stage updated but audit event could not be recorded.' }, { status: 500 });
  return NextResponse.json({ recovery_case: updated.data, event_id: event.data?.id ?? null });
}
