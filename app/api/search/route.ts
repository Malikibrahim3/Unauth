import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  ACTIVE_MERCHANT_COOKIE,
  PERMISSIONS,
  requirePermissionForMerchant,
  resolveCallerContext,
  resolvePermissions,
} from '@/lib/permissions';
import {
  normalizeRequestedSearchApiTypes,
  partitionSearchApiTypes,
  SEARCH_RESULT_TO_API_TYPE,
  type SearchResultType,
} from '@/lib/search/access';

export const dynamic = 'force-dynamic';

const SEARCH_RESULT_TYPES = [
  'customer',
  'order',
  'case',
  'ticket',
  'shipment',
  'refund',
  'return',
  'dispute',
  'loss',
  'recovery',
] as const satisfies readonly SearchResultType[];

const SEARCH_SOURCES = ['all', 'shopify', 'gorgias', 'shipbob', 'ups', 'manual'] as const;

const SearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  types: z.string().optional(),
  type: z.enum(SEARCH_RESULT_TYPES).optional(),
  source: z.enum(SEARCH_SOURCES).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(1000).optional(),
});

type SearchCursor = { sortAt: string; type: SearchResultType; id: string };
type SearchRow = {
  type: SearchResultType;
  id: string;
  label: string;
  sublabel?: string | null;
  href: string;
  source: string;
  sortAt: string;
};

function decodeCursor(raw?: string): SearchCursor | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Partial<SearchCursor>;
    if (
      typeof value.sortAt !== 'string'
      || Number.isNaN(Date.parse(value.sortAt))
      || !SEARCH_RESULT_TYPES.includes(value.type as SearchResultType)
      || typeof value.id !== 'string'
      || !z.string().uuid().safeParse(value.id).success
    ) throw new Error('invalid');
    return value as SearchCursor;
  } catch {
    throw new Error('invalid_search_cursor');
  }
}

function encodeCursor(row: SearchRow) {
  return Buffer.from(JSON.stringify({ sortAt: row.sortAt, type: row.type, id: row.id }), 'utf8').toString('base64url');
}

export async function GET(request: NextRequest) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const parsed = SearchQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid search request', details: parsed.error.flatten() }, { status: 400 });
  }

  let cursor: SearchCursor | null;
  try {
    cursor = decodeCursor(parsed.data.cursor);
  } catch {
    return NextResponse.json({ error: 'Invalid search cursor' }, { status: 400 });
  }

  const service = createServiceClient();
  const ctx = await resolveCallerContext(
    service,
    user.id,
    request.cookies.get(ACTIVE_MERCHANT_COOKIE)?.value,
  );
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const permissions = new Set(await resolvePermissions(service, ctx));
  const searchPermission = permissions.has(PERMISSIONS.VIEW_CUSTOMERS)
    ? PERMISSIONS.VIEW_CUSTOMERS
    : permissions.has(PERMISSIONS.VIEW_INBOX)
      ? PERMISSIONS.VIEW_INBOX
      : null;
  if (!searchPermission) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const gate = await requirePermissionForMerchant(service, user.id, ctx.merchantId, searchPermission);
  if (gate.denied) return gate.denied;

  const normalizedRequested = normalizeRequestedSearchApiTypes(parsed.data.types);
  if (!normalizedRequested.length) {
    return NextResponse.json({ error: 'No supported record types were requested' }, { status: 400 });
  }
  const { authorized, restricted } = partitionSearchApiTypes(normalizedRequested, permissions);
  if (!authorized.length) {
    return NextResponse.json({ error: 'Forbidden', restrictedTypes: restricted }, { status: 403 });
  }
  if (parsed.data.type && !authorized.includes(SEARCH_RESULT_TO_API_TYPE[parsed.data.type])) {
    return NextResponse.json({ error: 'Forbidden', restrictedTypes: [SEARCH_RESULT_TO_API_TYPE[parsed.data.type]] }, { status: 403 });
  }

  const { data, error } = await service.rpc('workspace_search_page_v1', {
    p_merchant_id: ctx.merchantId,
    p_query: parsed.data.q.replace(/\s+/g, ' '),
    p_types: authorized,
    p_source: parsed.data.source,
    p_result_type: parsed.data.type ?? null,
    p_cursor_sort_at: cursor?.sortAt ?? null,
    p_cursor_result_type: cursor?.type ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: parsed.data.limit,
  });

  if (error || !data || typeof data !== 'object') {
    console.error('workspace_search_page_v1_failed', { code: error?.code, message: error?.message });
    return NextResponse.json({ error: 'Workspace search is unavailable' }, { status: 503 });
  }

  const payload = data as unknown as {
    items?: SearchRow[];
    counts?: Record<string, number>;
    total?: number;
    hasMore?: boolean;
  };
  const rows = Array.isArray(payload.items) ? payload.items : [];
  const publicRows = rows.map(({ sortAt: _sortAt, source, ...row }) => ({ ...row, source }));
  const nextCursor = payload.hasMore === true && rows.length
    ? encodeCursor(rows[rows.length - 1]!)
    : null;

  return NextResponse.json({
    results: publicRows,
    query: parsed.data.q,
    source: parsed.data.source,
    limit: parsed.data.limit,
    total: Number(payload.total ?? 0),
    counts: payload.counts ?? { all: 0 },
    nextCursor,
    partialFailures: [],
    restrictedTypes: restricted,
  });
}
