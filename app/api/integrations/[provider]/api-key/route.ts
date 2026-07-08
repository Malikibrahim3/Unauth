import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { assertLiveProvider, saveIntegrationCredential, upsertMerchantIntegration } from '@/lib/integrations/auth';
import { requireIntegrationProvider } from '@/lib/integrations/registry';
import { verifyAfterShipApiKey } from '@/lib/integrations/providers/aftership';

const apiKeySchema = z.object({
  apiKey: z.string().trim().min(8),
  webhookSecret: z.string().trim().min(8).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: providerId } = await params;
  const provider = requireIntegrationProvider(providerId);
  assertLiveProvider(provider);
  const supportedApiKeyProviders = new Set(['aftership', 'shipbob']);
  if (provider.authMode !== 'api_key' || !supportedApiKeyProviders.has(provider.id)) {
    return NextResponse.json({ error: 'API-key connection is not supported for this provider.' }, { status: 400 });
  }

  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const parsed = apiKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid API key is required.' }, { status: 400 });
  }

  try {
    if (provider.id === 'aftership') {
      await verifyAfterShipApiKey(parsed.data.apiKey);
    }
    await saveIntegrationCredential(serviceClient, ctx.merchantId, provider, {
      apiKey: parsed.data.apiKey,
      ...(provider.id === 'aftership' ? { webhookSecret: parsed.data.webhookSecret ?? null } : {}),
    });
    await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'connected', { lastError: null });
    return NextResponse.json({ ok: true, provider: provider.id, status: 'connected' });
  } catch (error) {
    const message = error instanceof Error ? error.message : `${provider.id}_connect_failed`;
    await upsertMerchantIntegration(serviceClient, ctx.merchantId, provider, 'error', { lastError: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
