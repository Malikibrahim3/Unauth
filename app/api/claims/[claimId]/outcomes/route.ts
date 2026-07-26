import { NextResponse } from 'next/server';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import {
  CASE_OUTCOME_STATES,
  CASE_OUTCOME_TYPES,
  recordCaseOutcome,
  type CaseOutcomeState,
  type CaseOutcomeType,
} from '@/lib/reconciliation/outcomes';
import { TABLES } from '@/lib/supabase/tables';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function finiteInteger(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.VIEW_INBOX);
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(auth.service, claimId, auth.ctx.merchantId);
  if (!loaded.claim) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: loaded.denied === 'forbidden' ? 403 : 404 },
    );
  }
  const [outcomesResult, creditsResult] = await Promise.all([
    auth.service
      .from(TABLES.CASE_OUTCOME_EVENTS)
      .select('*')
      .eq('merchant_id', auth.ctx.merchantId)
      .eq('support_payout_case_id', claimId)
      .order('observed_at', { ascending: false }),
    auth.service
      .from(TABLES.PROVIDER_CREDIT_RECORDS)
      .select('*')
      .eq('merchant_id', auth.ctx.merchantId)
      .eq('support_payout_case_id', claimId)
      .order('occurred_at', { ascending: false }),
  ]);
  if (outcomesResult.error || creditsResult.error) {
    return NextResponse.json({ error: 'Could not load case outcomes.' }, { status: 500 });
  }
  return NextResponse.json({ outcomes: outcomesResult.data ?? [], provider_credits: creditsResult.data ?? [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (auth.response) return auth.response;
  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(auth.service, claimId, auth.ctx.merchantId);
  if (!loaded.claim) {
    return NextResponse.json(
      { error: 'Support payout case not found' },
      { status: loaded.denied === 'forbidden' ? 403 : 404 },
    );
  }
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const outcomeType = text(body?.outcome_type) as CaseOutcomeType | null;
  const state = text(body?.state) as CaseOutcomeState | null;
  const sourceSystem = text(body?.source_system) ?? 'merchant_manual';
  const matchStatus = text(body?.match_status);
  if (!outcomeType || !CASE_OUTCOME_TYPES.includes(outcomeType)) {
    return NextResponse.json({ error: 'Invalid outcome_type.' }, { status: 400 });
  }
  if (!state || !CASE_OUTCOME_STATES.includes(state)) {
    return NextResponse.json({ error: 'Invalid outcome state.' }, { status: 400 });
  }
  if (matchStatus && !['unmatched', 'candidate', 'matched', 'rejected'].includes(matchStatus)) {
    return NextResponse.json({ error: 'match_status must be unmatched, candidate, matched, or rejected.' }, { status: 400 });
  }
  const amountMinor = finiteInteger(body?.amount_minor);
  const retailValueMinor = finiteInteger(body?.retail_value_minor);
  const overrideReason = text(body?.override_reason);
  if (body?.followed_recommendation === false && !overrideReason) {
    return NextResponse.json({ error: 'override_reason is required when the recommendation was not followed.' }, { status: 422 });
  }

  const claimedItemId = text(body?.case_claimed_item_id);
  if (claimedItemId) {
    const { data: claimedItem, error } = await auth.service
      .from(TABLES.CASE_CLAIMED_ITEMS)
      .select('id')
      .eq('merchant_id', auth.ctx.merchantId)
      .eq('support_payout_case_id', claimId)
      .eq('id', claimedItemId)
      .maybeSingle();
    if (error) return NextResponse.json({ error: 'Could not validate the claimed item.' }, { status: 500 });
    if (!claimedItem) return NextResponse.json({ error: 'Claimed item is not part of this case.' }, { status: 422 });
  }

  try {
    const result = await recordCaseOutcome(auth.mutationClient, auth.ctx.merchantId, claimId, {
      caseClaimedItemId: claimedItemId,
      outcomeType,
      state,
      sourceSystem,
      sourceRecordId: text(body?.source_record_id),
      sourceExternalId: text(body?.source_external_id),
      correlationMethod: text(body?.correlation_method),
      matchStatus: (matchStatus as 'unmatched' | 'candidate' | 'matched' | 'rejected' | null) ?? 'matched',
      amountMinor,
      retailValueMinor,
      currency: text(body?.currency),
      occurredAt: text(body?.occurred_at),
      recommendedSnapshotId: text(body?.recommended_snapshot_id),
      followedRecommendation: typeof body?.followed_recommendation === 'boolean' ? body.followed_recommendation : null,
      overrideReason,
      actorUserId: auth.user.id,
      idempotencyKey,
      metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata as Record<string, unknown> : {},
    });
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not record outcome.';
    console.error('[claims.outcomes] failed', { claimId, merchantId: auth.ctx.merchantId, message });
    return NextResponse.json({ error: 'Could not record outcome.', message }, { status: 500 });
  }
}
