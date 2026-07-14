import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { assertLiveProvider, saveIntegrationCredential, upsertMerchantIntegration } from '@/lib/integrations/auth';
import { requireIntegrationProvider } from '@/lib/integrations/registry';
import { exchangeFedExClientCredentials } from '@/lib/integrations/providers/fedex';
import { exchangeUpsClientCredentials } from '@/lib/integrations/providers/ups';
import { verifyShipBobPat } from '@/lib/integrations/providers/shipbob';

const oauthCredentialSchema = z.object({
  clientId: z.string().trim().min(3),
  clientSecret: z.string().trim().min(3),
  accountNumber: z.string().trim().min(1).optional(),
  environment: z.enum(['sandbox', 'production']).default('production'),
});

const apiKeyCredentialSchema = z.object({
  apiKey: z.string().trim().min(8),
  sandbox: z.boolean().optional().default(false),
  channelId: z.string().trim().min(1).optional(),
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
  if (provider.id === 'shipbob') {
    const body = await request.json().catch(() => ({}));
    const parsed = apiKeyCredentialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Valid API credentials are required.' }, { status: 400 });
    }
    try {
      const access = await verifyShipBobPat(parsed.data.apiKey, parsed.data.sandbox, parsed.data.channelId);
      if (!parsed.data.channelId && access.channels.length > 1) {
        return NextResponse.json({
          error: 'account_selection_required',
          accounts: access.channels.map(({ id, name }) => ({ id, name })),
        }, { status: 409 });
      }
      const selected = parsed.data.channelId
        ? access.channels.find((channel) => channel.id === parsed.data.channelId)
        : access.channels[0];
      if (!selected) {
        return NextResponse.json({ error: 'Selected ShipBob channel is not available.' }, { status: 400 });
      }
      const environment = parsed.data.sandbox ? 'sandbox' : 'production';
      const connectionId = await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'connected', {
        providerAccountId: selected.id,
        providerAccountName: selected.name ?? 'ShipBob',
        environment,
        grantedScopes: provider.requiredScopes,
        lastError: null,
      });
      await saveIntegrationCredential(serviceClient, ctx.merchantId, provider, {
        apiKey: parsed.data.apiKey,
        sandbox: parsed.data.sandbox,
        channelId: selected.id,
        providerAccountId: selected.id,
        environment,
      }, { connectionId, scopes: provider.requiredScopes });
      return NextResponse.json({ ok: true, provider: provider.id, status: 'connected' });
    } catch (error) {
      const code = error instanceof Error ? error.message.split(':', 1)[0] : `${provider.id}_connect_failed`;
      return NextResponse.json({ error: code }, { status: 400 });
    }
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

    const accountReference = parsed.data.accountNumber
      ?? `client_${crypto.createHash('sha256').update(`${provider.id}:${parsed.data.clientId}`).digest('hex').slice(0, 24)}`;
    const connectionId = await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'connected', {
      providerAccountId: accountReference,
      providerAccountName: parsed.data.accountNumber ?? provider.name,
      environment: parsed.data.environment,
      grantedScopes: ['tracking', 'proof_of_delivery'],
      lastError: null,
    });
    await saveIntegrationCredential(serviceClient, ctx.merchantId, provider, {
      clientId: parsed.data.clientId,
      clientSecret: parsed.data.clientSecret,
      accountNumber: parsed.data.accountNumber,
      environment: parsed.data.environment,
      accessToken: token.accessToken,
    }, {
      connectionId,
      scopes: ['tracking', 'proof_of_delivery'],
      expiresAt: token.expiresAt,
    });
    return NextResponse.json({ ok: true, provider: provider.id, status: 'connected' });
  } catch (error) {
    const code = error instanceof Error ? error.message.split(':', 1)[0] : `${provider.id}_connect_failed`;
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
