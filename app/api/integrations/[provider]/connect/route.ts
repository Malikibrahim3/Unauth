import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { assertLiveProvider, saveIntegrationCredential, upsertMerchantIntegration } from '@/lib/integrations/auth';
import { requireIntegrationProvider } from '@/lib/integrations/registry';
import { exchangeFedExClientCredentials } from '@/lib/integrations/providers/fedex';
import { exchangeUpsClientCredentials } from '@/lib/integrations/providers/ups';

const oauthCredentialSchema = z.object({
  clientId: z.string().trim().min(3),
  clientSecret: z.string().trim().min(3),
  accountNumber: z.string().trim().min(1).optional(),
  environment: z.enum(['sandbox', 'production']).default('production'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = requireIntegrationProvider(providerId);
  assertLiveProvider(provider);

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  if (provider.id === 'shopify') {
    return NextResponse.json({ ok: true, redirect: '/settings/integrations/shopify' });
  }
  if (provider.id === 'gorgias') {
    return NextResponse.json({ ok: true, redirect: '/settings/integrations/gorgias' });
  }
  if (provider.id === 'self_fulfillment_pack') {
    await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'connected', { lastError: null });
    return NextResponse.json({ ok: true, provider: provider.id, status: 'connected' });
  }
  if (provider.id !== 'ups' && provider.id !== 'fedex') {
    return NextResponse.json({ error: 'Connect is not supported for this provider.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = oauthCredentialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid OAuth client credentials are required.' }, { status: 400 });
  }

  try {
    const token = provider.id === 'ups'
      ? await exchangeUpsClientCredentials({
          clientId: parsed.data.clientId,
          clientSecret: parsed.data.clientSecret,
          environment: parsed.data.environment,
        })
      : await exchangeFedExClientCredentials({
          clientId: parsed.data.clientId,
          clientSecret: parsed.data.clientSecret,
          environment: parsed.data.environment,
        });

    await saveIntegrationCredential(serviceClient, ctx.merchantId, provider, {
      clientId: parsed.data.clientId,
      clientSecret: parsed.data.clientSecret,
      accountNumber: parsed.data.accountNumber,
      environment: parsed.data.environment,
      accessToken: token.accessToken,
    }, {
      scopes: ['tracking', 'proof_of_delivery'],
      expiresAt: token.expiresAt,
    });
    await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'connected', { lastError: null });
    return NextResponse.json({ ok: true, provider: provider.id, status: 'connected' });
  } catch (error) {
    const message = error instanceof Error ? error.message : `${provider.id}_connect_failed`;
    await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'error', { lastError: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
