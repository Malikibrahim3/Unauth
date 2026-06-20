import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import {
  createPartnerRecoveryRule,
  type CreatePartnerRecoveryRuleInput,
  listPartnerRecoveryRules,
} from '@/lib/partners/store';
import type { Permission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Reads need view; create/update/deactivate need manage.
async function requireSettingsContext(permission: Permission) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, permission);
  if (denied) return { response: denied };
  return { serviceClient, ctx };
}

export async function GET() {
  const auth = await requireSettingsContext(PERMISSIONS.VIEW_SETTINGS);
  if ('response' in auth) return auth.response;
  const rules = await listPartnerRecoveryRules(auth.serviceClient, auth.ctx.merchantId);
  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const auth = await requireSettingsContext(PERMISSIONS.MANAGE_SETTINGS);
  if ('response' in auth) return auth.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  try {
    const rule = await createPartnerRecoveryRule(auth.serviceClient, {
      ...(body as Record<string, unknown>),
      merchant_id: auth.ctx.merchantId,
    } as CreatePartnerRecoveryRuleInput);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create recovery rule';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
