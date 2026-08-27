import { NextResponse } from 'next/server';
import { authorizeInvestigationRequest } from '@/lib/investigations/routeAuth';
import { idempotencyKeyFrom } from '@/lib/investigations/validation';
import { PERMISSIONS } from '@/lib/permissions';
import { getRecoveryCase } from '@/lib/recoveries/store';
import { providerResponseSchema, recordProviderResponse } from '@/lib/recoveries/providerResponses';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeInvestigationRequest(request, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (auth.response) return auth.response;
  const idempotencyKey = idempotencyKeyFrom(request);
  if (!idempotencyKey) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  const parsed = providerResponseSchema.safeParse({
    ...(await request.json().catch(() => ({}))),
    recovery_case_id: (await params).id,
  });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid provider response.', issues: parsed.error.flatten() }, { status: 400 });
  const recoveryCase = await getRecoveryCase(auth.service, auth.ctx.merchantId, (await params).id);
  if (!recoveryCase) return NextResponse.json({ error: 'Recovery case not found.' }, { status: 404 });
  try {
    const result = await recordProviderResponse(auth.mutationClient, auth.ctx.merchantId, auth.user.id, parsed.data, idempotencyKey);
    return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provider response failed.';
    const status = /not_found/.test(message) ? 404 : /cannot|invalid|exceeds/.test(message) ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
