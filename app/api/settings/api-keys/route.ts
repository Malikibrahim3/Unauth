import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';
import {
  apiKeyDisplayPrefix,
  generateApiKeyPlaintext,
  hashApiKey,
} from '@/lib/api/apiKeys';
import {
  generateWidgetTokenPlaintext,
  hashWidgetToken,
  widgetTokenDisplayPrefix,
} from '@/lib/api/widgetTokens';

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

type ApiKeyListRow = {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  rate_limit_per_minute: number;
};

async function GETHandler() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  const { data, error } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .select('id, key_prefix, name, created_at, last_used_at, revoked_at, rate_limit_per_minute')
    .eq('merchant_id', ctx.merchantId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false }) as unknown as {
    data: ApiKeyListRow[] | null;
    error: { message: string } | null;
  };

  if (error) {
    return NextResponse.json({ error: 'Failed to load API keys' }, { status: 500 });
  }

  return NextResponse.json({ keys: data ?? [] });
}

async function POSTHandler(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied) return denied;

  let parsed: z.infer<typeof createSchema>;
  try {
    const body = await req.json();
    parsed = createSchema.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const plaintext = generateApiKeyPlaintext();
  const keyHash = hashApiKey(plaintext);
  const keyPrefix = apiKeyDisplayPrefix(plaintext);
  const widgetToken = generateWidgetTokenPlaintext();
  const widgetTokenHash = hashWidgetToken(widgetToken);
  const widgetTokenPrefix = widgetTokenDisplayPrefix(widgetToken);

  const { data: inserted, error } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .insert({
      merchant_id: ctx.merchantId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name: parsed.name,
    })
    .select('id, key_prefix, name, created_at, rate_limit_per_minute')
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }

  const insertedKey = inserted as { id: string };
  const { error: widgetError } = await service
    .from(TABLES.MERCHANT_WIDGET_TOKENS)
    .insert({
      merchant_id: ctx.merchantId,
      api_key_id: insertedKey.id,
      token_hash: widgetTokenHash,
      token_prefix: widgetTokenPrefix,
    });

  if (widgetError) {
    await service
      .from(TABLES.MERCHANT_API_KEYS)
      .delete()
      .eq('id', insertedKey.id);
    return NextResponse.json({ error: 'Failed to create widget token' }, { status: 500 });
  }

  logAction({
    ctx,
    action: 'create_api_key',
    resourceType: 'merchant_api_key',
    resourceId: insertedKey.id,
    metadata: { name: parsed.name, key_prefix: keyPrefix },
    ip,
  });

  return NextResponse.json({
    key: {
      ...(inserted as object),
      secret: plaintext,
      widget_token: widgetToken,
      widget_token_prefix: widgetTokenPrefix,
    },
  });
}

export const GET = withRequestLogging('/api/settings/api-keys', GETHandler);
export const POST = withRequestLogging('/api/settings/api-keys', POSTHandler);
