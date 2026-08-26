import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getClientIp } from '@/lib/ratelimit';
import { withRequestLogging } from '@/lib/log';
import { createMerchantApiKey } from '@/lib/api/apiKeys';
import {
  API_RATE_LIMITS_PER_MINUTE,
  API_SCOPES,
  merchantHasMachineApiAccess,
  type ApiRateLimit,
  type ApiScope,
} from '@/lib/api/accessPolicy';

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  scopes: z.array(z.enum(API_SCOPES)).min(1).max(API_SCOPES.length).refine((scopes) => new Set(scopes).size === scopes.length),
  rateLimitPerMinute: z.number().int().refine((limit) => (API_RATE_LIMITS_PER_MINUTE as readonly number[]).includes(limit)),
});

type ApiKeyListRow = {
  id: string;
  key_prefix: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  rate_limit_per_minute: number;
  scopes: ApiScope[];
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
  if (!(await merchantHasMachineApiAccess(service, ctx.merchantId))) {
    return NextResponse.json({ error: 'Machine API access is available only to an enabled Enterprise workspace.' }, { status: 403 });
  }

  const { data, error } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .select('id, key_prefix, name, created_at, last_used_at, revoked_at, rate_limit_per_minute, scopes')
    .eq('merchant_id', ctx.merchantId)
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
  if (!(await merchantHasMachineApiAccess(service, ctx.merchantId))) {
    return NextResponse.json({ error: 'Machine API access is available only to an enabled Enterprise workspace.' }, { status: 403 });
  }

  let parsed: z.infer<typeof createSchema>;
  try {
    const body = await req.json();
    parsed = createSchema.parse(body);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const mutationClient = createServiceClient({
    audit: { actorId: ctx.userId, actorRole: ctx.role, requestIp: ip },
  });
  const created = await createMerchantApiKey(mutationClient, ctx.merchantId, parsed.name, {
    scopes: parsed.scopes as ApiScope[],
    rateLimitPerMinute: parsed.rateLimitPerMinute as ApiRateLimit,
  });
  if (!created) {
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }

  return NextResponse.json({
    key: {
      ...created.row,
      secret: created.secret,
      widget_token: created.widgetToken,
      widget_token_prefix: created.widgetTokenPrefix,
    },
  });
}

export const GET = withRequestLogging('/api/settings/api-keys', GETHandler);
export const POST = withRequestLogging('/api/settings/api-keys', POSTHandler);
