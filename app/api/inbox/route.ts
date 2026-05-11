import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { signalLabel } from '@/lib/copy/signalLabels';
import { withRequestLogging } from '@/lib/log';
import {
  fetchMerchantReviewQueueRows,
  fetchReviewQueueProfileIds,
  type ReviewQueueWindow,
} from '@/lib/supabase/merchantHelpers';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;

const querySchema = z.object({
  tab: z.enum(['today', 'week', 'all']).default('today'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().refine(
    (value) => PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number]),
    'Invalid pageSize',
  ).default(DEFAULT_PAGE_SIZE),
});

function topReason(signals: unknown): string {
  if (!Array.isArray(signals) || signals.length === 0) return 'Needs manual review';
  const first = signals.find((s) => typeof s === 'string') as string | undefined;
  if (!first) return 'Needs manual review';
  return signalLabel(first).short;
}

function getInboxWindow(tab: ReviewQueueWindow): { processedFrom?: string; processedTo?: string } {
  if (tab === 'all') return {};

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (tab === 'week') {
    const day = start.getDay();
    const daysSinceMonday = (day + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  }

  return {
    processedFrom: start.toISOString(),
    processedTo: now.toISOString(),
  };
}

async function GETHandler(req: NextRequest) {
  const parsed = querySchema.safeParse({
    tab: req.nextUrl.searchParams.get('tab') ?? undefined,
    page: req.nextUrl.searchParams.get('page') ?? undefined,
    pageSize: req.nextUrl.searchParams.get('pageSize') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid inbox query' }, { status: 400 });
  }

  const userClient = createClient();
  const { data, error: authError } = await userClient.auth.getUser();
  const user = data?.user ?? null;
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const { tab, page, pageSize } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const windowFilter = getInboxWindow(tab);

  try {
    const [{ rows, ownedJobIds }, totalResult] = await Promise.all([
      fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, {
        from,
        to,
        ...windowFilter,
      }),
      fetchMerchantReviewQueueRows(serviceClient, ctx.merchantId, {
        paginate: true,
        select: 'id',
        ...windowFilter,
      }),
    ]);

    const profileIds = await fetchReviewQueueProfileIds(
      serviceClient,
      ownedJobIds,
      rows.map((row: any) => row.id).filter(Boolean),
    );

    return NextResponse.json({
      items: rows.map((row: any) => ({
        id: row.id,
        order_id: row.order_id,
        identity_score: row.identity_score ?? 0,
        identity_confidence_grade: row.identity_confidence_grade ?? null,
        match_status: row.match_status ?? null,
        processed_at: row.processed_at,
        processing_job_id: row.job_id,
        customer_profile_id: profileIds.get(row.id) ?? null,
        customer_email: row.customer_email ?? null,
        customer_name: row.customer_name ?? null,
        order_value: row.order_value ?? null,
        reason: topReason(row.signals_matched),
      })),
      page,
      pageSize,
      tab,
      total: totalResult.rows.length,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load inbox' }, { status: 500 });
  }
}

export const GET = withRequestLogging('/api/inbox', GETHandler);
