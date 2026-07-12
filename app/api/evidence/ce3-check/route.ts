import { NextRequest, NextResponse } from 'next/server';
import { buildEvidencePackage } from '@/lib/evidence/buildPackage';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.GENERATE_EVIDENCE);
  if (denied) return denied;

  const profileId = request.nextUrl.searchParams.get('profileId');
  const orderId = request.nextUrl.searchParams.get('orderId');
  if (!profileId || !orderId) {
    return NextResponse.json({ error: 'profileId and orderId required' }, { status: 400 });
  }

  try {
    const pkg = await buildEvidencePackage(
      ctx.merchantId,
      profileId,
      orderId,
      service,
      ctx.userId,
      { referenceNumber: 'PREVIEW' },
    );
    return NextResponse.json({
      hasPriorMatchEvidence: pkg.ce3.eligible,
      reason: pkg.ce3.reason,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Evidence preview failed';
    if (reason.includes('Disputed order not found')) {
      return NextResponse.json({
        hasPriorMatchEvidence: false,
        reason: 'Disputed order not found in merchant account',
      });
    }
    return NextResponse.json({ hasPriorMatchEvidence: false, reason });
  }
}
