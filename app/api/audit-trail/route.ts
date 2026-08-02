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

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createScopedClient } from "@/lib/supabase/scoped";
import { TABLES } from "@/lib/supabase/tables";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAction } from "@/lib/permissions/audit";
import {
  auditActionLabel,
  auditResourceSummary,
} from "@/lib/audit/actionLabels";
import { claimEventSummary } from "@/lib/claims/events";
import { createRequestLogger, withRequestLogging } from "@/lib/log";
import { hashId } from "@/lib/ui/displayRef";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const dynamic = "force-dynamic";

async function GETHandler(request: NextRequest) {
  const logger = createRequestLogger(request, "/api/audit-trail");
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.VIEW_AUDIT_TRAIL,
  );
  if (denied) return denied;
  const scopedService = createScopedClient(ctx.merchantId, service);

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)),
  );
  const action = searchParams.get("action") ?? null;
  const actorUserId = searchParams.get("actorUserId") ?? null;
  const resourceType = searchParams.get("resourceType") ?? null;
  const startDate = searchParams.get("startDate") ?? null;
  const endDate = searchParams.get("endDate") ?? null;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = scopedService
    .from("user_action_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (action) query = query.eq("action", action);
  if (actorUserId) query = query.eq("actor_user_id", actorUserId);
  if (resourceType && resourceType !== "claim")
    query = query.eq("resource_type", resourceType);
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const shouldIncludeActionLog = resourceType !== "claim";
  const {
    data: actionRows,
    count,
    error,
  } = shouldIncludeActionLog
    ? await query
    : { data: [], count: 0, error: null };

  if (error) {
    logger.error("audit_trail.query_failed", { error });
    return NextResponse.json(
      { error: "Failed to fetch audit trail" },
      { status: 500 },
    );
  }

  let claimEventQuery = service
    .from("claim_events")
    .select(
      "id,claim_id,merchant_id,event_type,from_status,to_status,note,actor_user_id,metadata,created_at",
    )
    .eq("merchant_id", ctx.merchantId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (action) claimEventQuery = claimEventQuery.eq("event_type", action);
  if (actorUserId)
    claimEventQuery = claimEventQuery.eq("actor_user_id", actorUserId);
  if (startDate) claimEventQuery = claimEventQuery.gte("created_at", startDate);
  if (endDate) claimEventQuery = claimEventQuery.lte("created_at", endDate);
  const { data: claimEvents, error: claimEventError } =
    resourceType && resourceType !== "claim"
      ? { data: [], error: null }
      : await claimEventQuery;
  if (claimEventError) {
    logger.error("audit_trail.claim_events_query_failed", {
      error: claimEventError,
    });
    return NextResponse.json(
      { error: "Failed to fetch audit trail" },
      { status: 500 },
    );
  }

  const claimIds = [
    ...new Set(
      (claimEvents ?? []).flatMap((event: any) =>
        event.claim_id ? [event.claim_id] : [],
      ),
    ),
  ] as string[];
  const claimHrefById = new Map<string, string>();
  if (claimIds.length > 0) {
    const { data: claimRows } = await service
      .from(TABLES.MERCHANT_CLAIMS)
      .select("id")
      .eq("merchant_id", ctx.merchantId)
      .in("id", claimIds);
    for (const claim of (claimRows ?? []) as Array<{ id: string }>) {
      claimHrefById.set(claim.id, `/claims/${claim.id}`);
    }
  }

  const mappedClaimEvents = (claimEvents ?? []).map((event: any) => ({
    id: event.id,
    merchant_id: event.merchant_id,
    actor_user_id: event.actor_user_id,
    action: event.event_type,
    resource_type: "claim",
    resource_id: event.claim_id,
    resource_href: claimHrefById.get(event.claim_id) ?? "/claims",
    metadata: {
      note: event.note,
      ...(event.metadata ?? {}),
      previous_status:
        event.from_status ??
        event.metadata?.previous_status ??
        event.metadata?.from_status ??
        null,
      new_status:
        event.to_status ??
        event.metadata?.new_status ??
        event.metadata?.to_status ??
        null,
    },
    created_at: event.created_at,
  }));

  const rows = [...(actionRows ?? []), ...mappedClaimEvents]
    .sort((a: any, b: any) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    )
    .slice(0, limit);
  const total = (count ?? 0) + mappedClaimEvents.length;

  if (format === "csv") {
    const exportDenied = await requirePermission(
      service,
      user.id,
      PERMISSIONS.EXPORT_AUDIT,
    );
    if (exportDenied.denied) return exportDenied.denied;

    const actorIds = [
      ...new Set(
        rows.flatMap((r: { actor_user_id?: string | null }) =>
          r.actor_user_id ? [r.actor_user_id] : [],
        ),
      ),
    ] as string[];
    const actorMap: Record<string, { email: string; role: string }> = {};
    if (actorIds.length > 0) {
      const { data: memberRows } = await service
        .from(TABLES.MERCHANT_MEMBERS)
        .select("user_id, invited_email, role")
        .eq("merchant_id", ctx.merchantId)
        .in("user_id", actorIds);
      for (const m of (memberRows ?? []) as Array<{
        user_id: string | null;
        invited_email: string;
        role: string;
      }>) {
        if (m.user_id)
          actorMap[m.user_id] = { email: m.invited_email, role: m.role };
      }
    }

    function resolveActor(
      actorUserId: string | null,
      actorRole: string | null,
    ): string {
      if (!actorUserId) return "system";
      const known = actorMap[actorUserId];
      if (known) return `${known.email} (${known.role})`;
      return `${hashId(actorUserId)} (${actorRole ?? "user"})`;
    }

    const csvRows = rows.map(
      (row: {
        created_at: string;
        action: string;
        resource_type: string | null;
        resource_id: string | null;
        actor_user_id?: string | null;
        actor_role?: string | null;
        metadata?: Record<string, unknown> | null;
      }) => {
        const summary =
          row.resource_type === "claim"
            ? claimEventSummary({
                event_type: row.action,
                previous_status:
                  typeof row.metadata?.previous_status === "string"
                    ? row.metadata.previous_status
                    : null,
                new_status:
                  typeof row.metadata?.new_status === "string"
                    ? row.metadata.new_status
                    : null,
                previous_decision:
                  typeof row.metadata?.previous_decision === "string"
                    ? row.metadata.previous_decision
                    : null,
                new_decision:
                  typeof row.metadata?.new_decision === "string"
                    ? row.metadata.new_decision
                    : null,
                previous_outcome:
                  typeof row.metadata?.previous_outcome === "string"
                    ? row.metadata.previous_outcome
                    : null,
                new_outcome:
                  typeof row.metadata?.new_outcome === "string"
                    ? row.metadata.new_outcome
                    : null,
                note:
                  typeof row.metadata?.note === "string"
                    ? row.metadata.note
                    : null,
              })
            : JSON.stringify(row.metadata ?? {});

        return [
          row.created_at,
          auditActionLabel(row.action, row.resource_type),
          auditResourceSummary(row.resource_type, row.resource_id),
          resolveActor(row.actor_user_id ?? null, row.actor_role ?? null),
          summary,
        ]
          .map(csvCell)
          .join(",");
      },
    );

    const csv = [
      ["timestamp", "action", "object", "actor", "summary"].join(","),
      ...csvRows,
    ].join("\n");

    await logAction({
      ctx,
      action: "export_audit",
      resourceType: "audit_log",
      metadata: {
        format: "csv",
        rowCount: rows.length,
        resourceType: resourceType ?? "all",
      },
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="audit-trail-export.csv"',
      },
    });
  }

  await logAction({ ctx, action: "view_audit_trail", resourceType: "audit_log" });

  return NextResponse.json({
    rows,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}

export const GET = withRequestLogging("/api/audit-trail", GETHandler);
