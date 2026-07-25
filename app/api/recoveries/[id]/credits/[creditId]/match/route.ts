import { NextResponse } from 'next/server';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import { matchProviderCredit } from '@/lib/reconciliation/providerCredits';
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
  if (!idempotencyKeyFrom(request)) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  const { id, creditId } = await params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const matchStatus = text(body?.match_status);
  if (!matchStatus || !['unmatched', 'candidate', 'matched', 'rejected'].includes(matchStatus)) {
    return NextResponse.json({ error: 'match_status must be unmatched, candidate, matched, or rejected.' }, { status: 400 });
  }
  const { data: credit, error: creditError } = await auth.service
    .from(TABLES.PROVIDER_CREDIT_RECORDS)
    .select('id,recovery_case_id')
    .eq('merchant_id', auth.ctx.merchantId)
    .eq('id', creditId)
    .eq('recovery_case_id', id)
    .maybeSingle();
  if (creditError) return NextResponse.json({ error: 'Could not validate provider credit.' }, { status: 500 });
  if (!credit) return NextResponse.json({ error: 'Provider credit not found for this recovery case.' }, { status: 404 });

  try {
    const result = await matchProviderCredit(auth.mutationClient, auth.ctx.merchantId, credit.id, {
      matchStatus: matchStatus as 'unmatched' | 'candidate' | 'matched' | 'rejected',
      matchMethod: text(body?.match_method),
      matchConfidence: typeof body?.match_confidence === 'number' ? body.match_confidence : null,
      matchedBy: auth.user.id,
    });
    return NextResponse.json({ result });
  } catch (error) {
    console.error('[recoveries.credit-match] failed', error);
    return NextResponse.json({ error: 'Could not update provider credit match.' }, { status: 500 });
  }
}
