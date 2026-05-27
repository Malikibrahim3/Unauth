// app/api/audit-trail/route.ts
// GET /api/audit-trail
// Returns paginated user_action_log for the authenticated merchant.
// Requires VIEW_AUDIT_TRAIL permission (owner/admin by default).
//
// Query params:
//   page          (number, default 1)
//   limit         (number, default 50, max 200)
//   action        (string, filter by action type)
//   actorUserId   (string, filter by actor)
//   resourceType  (string, filter by resource type)
//   startDate     (ISO string)
//   endDate       (ISO string)

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { createScopedClient } from '@/lib/supabase/scoped';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { auditActionLabel, auditResourceSummary } from '@/lib/audit/actionLabels';
import { claimEventSummary } from '@/lib/claims/events';
import { createRequestLogger, withRequestLogging } from '@/lib/log';

function csvCell(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const dynamic = 'force-dynamic';

async function GETHandler(request: NextRequest) {
  const logger = createRequestLogger(request, '/api/audit-trail');
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_AUDIT_TRAIL);
  if (denied) return denied;
  const scopedService = createScopedClient(ctx.merchantId, service);

  const { searchParams } = new URL(request.url);
  const format       = searchParams.get('format')       ?? 'json';
  const page         = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
  const limit        = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const action       = searchParams.get('action')       ?? null;
  const actorUserId  = searchParams.get('actorUserId')  ?? null;
  const resourceType = searchParams.get('resourceType') ?? null;
  const startDate    = searchParams.get('startDate')    ?? null;
  const endDate      = searchParams.get('endDate')      ?? null;

  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = scopedService
    .from('user_action_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (action)       query = query.eq('action', action);
  if (actorUserId)  query = query.eq('actor_user_id', actorUserId);
  if (resourceType && resourceType !== 'claim') query = query.eq('resource_type', resourceType);
  if (startDate)    query = query.gte('created_at', startDate);
  if (endDate)      query = query.lte('created_at', endDate);

  const shouldIncludeActionLog = resourceType !== 'claim';
  const { data: actionRows, count, error } = shouldIncludeActionLog
    ? await query
    : { data: [], count: 0, error: null };

  if (error) {
    logger.error('audit_trail.query_failed', { error });
    return NextResponse.json({ error: 'Failed to fetch audit trail' }, { status: 500 });
  }

  let claimEventQuery = service
    .from('claim_events' as any)
    .select('id,claim_id,merchant_id,event_type,previous_status,new_status,previous_decision,new_decision,previous_outcome,new_outcome,note,actor_user_id,metadata,created_at')
    .eq('merchant_id', ctx.merchantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (action) claimEventQuery = claimEventQuery.eq('event_type', action);
  if (actorUserId) claimEventQuery = claimEventQuery.eq('actor_user_id', actorUserId);
  if (startDate) claimEventQuery = claimEventQuery.gte('created_at', startDate);
  if (endDate) claimEventQuery = claimEventQuery.lte('created_at', endDate);
  const { data: claimEvents, error: claimEventError } = resourceType && resourceType !== 'claim'
    ? { data: [], error: null }
    : await claimEventQuery;
  if (claimEventError) {
    logger.error('audit_trail.claim_events_query_failed', { error: claimEventError });
    return NextResponse.json({ error: 'Failed to fetch audit trail' }, { status: 500 });
  }

  const mappedClaimEvents = (claimEvents ?? []).map((event: any) => ({
    id: event.id,
    merchant_id: event.merchant_id,
    actor_user_id: event.actor_user_id,
    action: event.event_type,
    resource_type: 'claim',
    resource_id: event.claim_id,
    metadata: {
      previous_status: event.previous_status,
      new_status: event.new_status,
      previous_decision: event.previous_decision,
      new_decision: event.new_decision,
      previous_outcome: event.previous_outcome,
      new_outcome: event.new_outcome,
      note: event.note,
      ...(event.metadata ?? {}),
    },
    created_at: event.created_at,
  }));

  const rows = [...(actionRows ?? []), ...mappedClaimEvents]
    .sort((a: any, b: any) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
    .slice(0, limit);
  const total = (count ?? 0) + mappedClaimEvents.length;

  if (format === 'csv') {
    const exportDenied = await requirePermission(service, user.id, PERMISSIONS.EXPORT_AUDIT);
    if (exportDenied.denied) return exportDenied.denied;

    const actorIds = [...new Set(rows.map((r: { actor_user_id?: string | null }) => r.actor_user_id).filter(Boolean))] as string[];
    const actorMap: Record<string, { email: string; role: string }> = {};
    if (actorIds.length > 0) {
      const { data: memberRows } = await service
        .from('merchant_members' as never)
        .select('user_id, invited_email, role')
        .eq('merchant_id', ctx.merchantId)
        .in('user_id', actorIds);
      const { data: merchantRow2 } = await service
        .from('merchants')
        .select('user_id')
        .eq('id', ctx.merchantId)
        .maybeSingle();
      for (const m of (memberRows ?? []) as Array<{ user_id: string | null; invited_email: string; role: string }>) {
        if (m.user_id) actorMap[m.user_id] = { email: m.invited_email, role: m.role };
      }
      if (merchantRow2?.user_id && !actorMap[merchantRow2.user_id]) {
        actorMap[merchantRow2.user_id] = { email: user.email ?? 'owner', role: 'owner' };
      }
    }

    function resolveActor(actorUserId: string | null, actorRole: string | null): string {
      if (!actorUserId) return 'system';
      const known = actorMap[actorUserId];
      if (known) return `${known.email} (${known.role})`;
      return `${actorUserId.slice(0, 8)} (${actorRole ?? 'user'})`;
    }

    const csvRows = rows.map((row: {
      created_at: string;
      action: string;
      resource_type: string | null;
      resource_id: string | null;
      actor_user_id?: string | null;
      actor_role?: string | null;
      metadata?: Record<string, unknown> | null;
    }) => {
      const summary = row.resource_type === 'claim'
        ? claimEventSummary({
            event_type: row.action,
            previous_status: typeof row.metadata?.previous_status === 'string' ? row.metadata.previous_status : null,
            new_status: typeof row.metadata?.new_status === 'string' ? row.metadata.new_status : null,
            previous_decision: typeof row.metadata?.previous_decision === 'string' ? row.metadata.previous_decision : null,
            new_decision: typeof row.metadata?.new_decision === 'string' ? row.metadata.new_decision : null,
            previous_outcome: typeof row.metadata?.previous_outcome === 'string' ? row.metadata.previous_outcome : null,
            new_outcome: typeof row.metadata?.new_outcome === 'string' ? row.metadata.new_outcome : null,
            note: typeof row.metadata?.note === 'string' ? row.metadata.note : null,
          })
        : JSON.stringify(row.metadata ?? {});

      return [
        row.created_at,
        auditActionLabel(row.action, row.resource_type),
        auditResourceSummary(row.resource_type, row.resource_id),
        resolveActor(row.actor_user_id ?? null, row.actor_role ?? null),
        summary,
      ].map(csvCell).join(',');
    });

    const csv = [
      ['timestamp', 'action', 'object', 'actor', 'summary'].join(','),
      ...csvRows,
    ].join('\n');

    logAction({
      ctx,
      action: 'export_audit',
      resourceType: 'audit_log',
      metadata: { format: 'csv', rowCount: rows.length, resourceType: resourceType ?? 'all' },
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="audit-trail-export.csv"',
      },
    });
  }

  logAction({ ctx, action: 'view_audit_trail', resourceType: 'audit_log' });

  return NextResponse.json({
    rows,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}

export const GET = withRequestLogging('/api/audit-trail', GETHandler);
