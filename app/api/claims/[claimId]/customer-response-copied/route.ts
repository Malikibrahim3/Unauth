import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { appendClaimEvent } from '@/lib/claims/events';
import { buildCustomerResponse, customerResponseContainsInternalTerm } from '@/lib/claims/customerResponses';

export async function POST(request: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const claim = loaded.claim!;
  const decision = typeof body?.decision === 'string' ? body.decision : null;
  const outcome = typeof body?.outcome === 'string' ? body.outcome : null;
  const responseText = typeof body?.responseText === 'string'
    ? body.responseText
    : buildCustomerResponse({ decision, outcome, status: claim.status });
  if (customerResponseContainsInternalTerm(responseText)) {
    return NextResponse.json({ error: 'Customer response contains internal language' }, { status: 400 });
  }
  try {
    // v2 claims has no last_customer_response_* columns; the response record
    // lives on the customer_response_saved event below.
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      event_type: 'customer_response_saved',
      actor_user_id: user.id,
      metadata: {
        decision,
        outcome,
        response_text: responseText,
      },
    });
    await appendClaimEvent(serviceClient, {
      claim_id: claimId,
      merchant_id: ctx.merchantId,
      event_type: 'customer_response_copied',
      actor_user_id: user.id,
      metadata: {
        decision,
        outcome,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to record customer response copy' }, { status: 500 });
  }
}
