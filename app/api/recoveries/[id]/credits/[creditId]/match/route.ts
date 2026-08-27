import { NextResponse } from 'next/server';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import { transitionProviderCredit, type ProviderCreditTransition } from '@/lib/reconciliation/providerCredits';
import { TABLES } from '@/lib/supabase/tables';
import { PERMISSIONS } from '@/lib/permissions';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; creditId: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (auth.response) return auth.response;
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  const { id, creditId } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = text(body?.action) ?? text(body?.match_status);
  const normalizedAction = action === 'rejected' ? 'dismissed' : action;
  if (!normalizedAction || !['candidate', 'matched', 'dismissed', 'reconciled'].includes(normalizedAction)) {
    return NextResponse.json({ error: 'action must be candidate, matched, dismissed, or reconciled.' }, { status: 400 });
  }
  const expectedVersion = Number(body?.expected_version);
  const reason = text(body?.reason);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1 || !reason) {
    return NextResponse.json({ error: 'expected_version and a reason are required.' }, { status: 400 });
  }
  const { data: credit, error: creditError } = await auth.service
    .from(TABLES.PROVIDER_CREDIT_RECORDS)
    .select('id,recovery_case_id,state_version')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('id', creditId)
    .eq('recovery_case_id', id)
    .maybeSingle();
  if (creditError) return NextResponse.json({ error: 'Could not validate provider credit.' }, { status: 500 });
  if (!credit) return NextResponse.json({ error: 'Provider credit not found for this recovery case.' }, { status: 404 });

  try {
    const result = await transitionProviderCredit(auth.mutationClient, auth.ctx.merchantId, id, credit.id, {
      action: normalizedAction as ProviderCreditTransition,
      expectedVersion,
      matchMethod: text(body?.match_method),
      matchConfidence: typeof body?.match_confidence === 'number' ? body.match_confidence : null,
      actorUserId: auth.user.id,
      reason,
      idempotencyKey,
    });
    return NextResponse.json({ result });
  } catch (error) {
    console.error('[recoveries.credit-match] failed', error);
    const message = error instanceof Error ? error.message : '';
    const status = /version_conflict/.test(message) ? 409 : /invalid|requires|exceeds|mismatch/.test(message) ? 422 : 500;
    return NextResponse.json({ error: status === 500 ? 'Could not update provider credit match.' : message }, { status });
  }
}
