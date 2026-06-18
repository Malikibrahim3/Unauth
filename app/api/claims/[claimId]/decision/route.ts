import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { loadClaimForMerchant } from '@/lib/claims/access';
import { evaluateClaimDecision } from '@/lib/claims/decision/evaluate';
import { formatClaimDecisionRecommendation } from '@/lib/claims/decision/format';

export const dynamic = 'force-dynamic';

/**
 * POST /api/claims/[claimId]/decision
 *
 * Assembles claim decision context, evaluates merchant rules, persists audit,
 * and returns the recommendation with traceability.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ claimId: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { claimId } = await params;
  const loaded = await loadClaimForMerchant(serviceClient, claimId, ctx.merchantId);
  if (loaded.denied === 'not_found') return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (loaded.denied === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await evaluateClaimDecision({
      client: serviceClient,
      merchantId: ctx.merchantId,
      claimId,
      actorId: user.id,
      source: 'claim_review',
    });
    if (!result) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    const formatted = formatClaimDecisionRecommendation(result.evaluation, result.ruleCount);

    return NextResponse.json({
      evaluation: result.evaluation,
      ruleCount: result.ruleCount,
      evaluatedAt: result.evaluatedAt,
      formatted,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[claims.decision] failed', { claimId, merchantId: ctx.merchantId, message });
    return NextResponse.json({ error: 'Failed to evaluate claim decision', message }, { status: 500 });
  }
}
