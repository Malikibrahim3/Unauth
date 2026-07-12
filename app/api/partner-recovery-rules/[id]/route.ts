import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { updatePartnerRecoveryRule, type UpdatePartnerRecoveryRuleInput } from '@/lib/partners/store';

export const dynamic = 'force-dynamic';

/**
 * Maintain a partner recovery rule: update fields or deactivate
 * (PATCH { active: false }). Mutations require manage settings — not view-only.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id } = await params;
  try {
    const rule = await updatePartnerRecoveryRule(serviceClient, ctx.merchantId, id, body as UpdatePartnerRecoveryRuleInput);
    return NextResponse.json({ rule });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update partner recovery rule';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
