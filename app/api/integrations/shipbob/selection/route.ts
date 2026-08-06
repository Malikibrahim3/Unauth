import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermissionForMerchant } from '@/lib/permissions';
import {
  consumePendingAccountSelection,
  getPendingAccountSelection,
} from '@/lib/integrations/pendingAccountSelection';
import { completeShipBobConnection } from '@/lib/integrations/providers/shipbobCompletion';

const idSchema = z.string().uuid();
const selectionSchema = z.object({
  selectionId: z.string().uuid(),
  accountId: z.string().trim().min(1).max(200),
});
const tokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
});

async function authenticatedUser() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  return user;
}
export async function GET(request: NextRequest) {
  const parsedId = idSchema.safeParse(request.nextUrl.searchParams.get('selection'));
  if (!parsedId.success) return NextResponse.json({ error: 'Invalid selection.' }, { status: 400 });
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const pending = await getPendingAccountSelection(serviceClient, {
    id: parsedId.data,
    userId: user.id,
    providerId: 'shipbob',
  });
  if (!pending) return NextResponse.json({ error: 'Selection expired or already used.' }, { status: 404 });
  const { denied } = await requirePermissionForMerchant(
    serviceClient,
    user.id,
    pending.merchantId,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({
    accounts: pending.accounts,
    environment: pending.environment,
    expiresAt: pending.expiresAt,
  });
}

export async function POST(request: NextRequest) {
  const parsed = selectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid account selection.' }, { status: 400 });
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const serviceClient = createServiceClient();
  const pending = await getPendingAccountSelection(serviceClient, {
    id: parsed.data.selectionId,
    userId: user.id,
    providerId: 'shipbob',
  });
  if (!pending) return NextResponse.json({ error: 'Selection expired or already used.' }, { status: 404 });
  const { denied } = await requirePermissionForMerchant(
    serviceClient,
    user.id,
    pending.merchantId,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  if (denied) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const consumed = await consumePendingAccountSelection(serviceClient, {
      id: pending.id,
      userId: user.id,
      providerId: 'shipbob',
      merchantId: pending.merchantId,
      selectedAccountId: parsed.data.accountId,
    });
    const token = tokenSchema.parse(consumed.credentialPayload);
    const account = consumed.selection.accounts.find(({ id }) => id === parsed.data.accountId)!;
    const completed = await completeShipBobConnection({
      client: serviceClient,
      merchantId: pending.merchantId,
      userId: user.id,
      token,
      channel: { id: account.id, ...(account.name ? { name: account.name } : {}) },
      sandbox: pending.environment === 'sandbox',
    });
    const redirect = new URL('/sources/connected', request.url);
    redirect.searchParams.set('shipbob_connected', '1');
    if (!completed.subscriptionHealthy) redirect.searchParams.set('shipbob_warning', 'webhook_subscription_failed');
    return NextResponse.json({ ok: true, redirect: `${redirect.pathname}${redirect.search}` });
  } catch (error) {
    const code = error instanceof Error ? error.message.split(':', 1)[0] : 'shipbob_selection_failed';
    const status = code.includes('policy_conflict') || code.includes('already_owned') ? 409 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
