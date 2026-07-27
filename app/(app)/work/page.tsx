import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { WorkbenchPage } from "@/components/ui";
import { WorkQueue, type WorkQueueItem, type WorkViewCounts } from "@/components/work/WorkQueue";
import { WorkQueuePulse } from "@/components/work/WorkQueuePulse";
import { countOpenExceptions, listExceptions } from "@/lib/exceptions/store";
import { countWorkDueBands, countWorkViews } from "@/lib/work/store";
import { formatNumber } from "@/lib/utils/format";
import { shortRef, hashId } from "@/lib/ui/displayRef";
import { now } from "@/lib/time/clock";
import { loadWorkOwnerDirectory } from "@/lib/work/owners";

export const dynamic = "force-dynamic";
type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  owner_role: string | null;
  owner_user_id: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  created_at: string;
  source: string;
  support_payout_case_id: string | null;
  loss_case_id: string | null;
  recovery_case_id: string | null;
  blocking_reason: string | null;
  source_metadata: Record<string, unknown> | null;
};

export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_INBOX,
  );
  if (denied) redirect("/dashboard");
  const params = await searchParams;
  const view = params.view ?? "open";
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;
  const asOf = now();
  let query = serviceClient
    .from(TABLES.WORK_TASKS)
    .select(
      "id,title,description,owner_role,owner_user_id,status,priority,due_at,created_at,source,support_payout_case_id,loss_case_id,recovery_case_id,blocking_reason,source_metadata",
      { count: "exact" },
    )
    .eq("merchant_id", ctx.merchantId)
    .order("due_at", { ascending: true, nullsFirst: false });
  if (view === "completed") query = query.eq("status", "completed");
  else query = query.neq("status", "completed").neq("status", "cancelled");
  if (view === "mine") query = query.eq("owner_user_id", user.id);
  if (view === "unassigned") query = query.is("owner_user_id", null);
  if (view === "blocked") query = query.eq("status", "blocked");
  if (view === "evidence-needed")
    query = query.ilike("blocking_reason", "%evidence%");
  if (view === "decision-needed")
    query = query.or("title.ilike.%decision%,blocking_reason.ilike.%decision%");
  if (view === "due-today") {
    const start = new Date(asOf);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query
      .gte("due_at", start.toISOString())
      .lt("due_at", end.toISOString());
  }
  if (view === "overdue") query = query.lt("due_at", asOf.toISOString());
  if (view === "no-sla") query = query.is("due_at", null);
  /*
   * Deadline bands selected from the queue pulse (§6.8). These are presentation
   * filters on this route using the same boundaries as the server aggregate, so
   * a band's count and its filtered row set always agree.
   */
  if (view === "due-1-3" || view === "due-4-7" || view === "due-later") {
    const todayStart = new Date(asOf);
    todayStart.setUTCHours(0, 0, 0, 0);
    const dayAfterToday = new Date(todayStart);
    dayAfterToday.setUTCDate(dayAfterToday.getUTCDate() + 1);
    const dayFour = new Date(todayStart);
    dayFour.setUTCDate(dayFour.getUTCDate() + 4);
    const dayEight = new Date(todayStart);
    dayEight.setUTCDate(dayEight.getUTCDate() + 8);
    if (view === "due-1-3") {
      query = query
        .gte("due_at", dayAfterToday.toISOString())
        .lt("due_at", dayFour.toISOString());
    } else if (view === "due-4-7") {
      query = query.gte("due_at", dayFour.toISOString()).lt("due_at", dayEight.toISOString());
    } else {
      query = query.gte("due_at", dayEight.toISOString());
    }
  }
  const includeExceptions =
    view === "open" || view === "integration-exceptions" || view === "overdue" || view === "no-sla";
  const exceptionDeadline = view === "overdue"
    ? { dueBefore: asOf.toISOString() }
    : view === "no-sla"
      ? { dueIsNull: true }
      : {};
  const [taskResult, openExceptionCount, exceptionRows, filteredExceptionCount, ownerDirectory] =
    await Promise.all([
      view === "integration-exceptions"
        ? Promise.resolve({ data: [], count: 0 })
        : query.range((page - 1) * pageSize, page * pageSize - 1),
      countOpenExceptions(serviceClient, ctx.merchantId),
      includeExceptions
        ? listExceptions(serviceClient, ctx.merchantId, { status: "open", limit: pageSize, ...exceptionDeadline })
        : Promise.resolve([]),
      includeExceptions
        ? countOpenExceptions(serviceClient, ctx.merchantId, exceptionDeadline)
        : Promise.resolve(0),
      loadWorkOwnerDirectory(serviceClient, ctx.merchantId),
    ]);
  const dueBands = await countWorkDueBands(serviceClient, ctx.merchantId, asOf);
  const tasks: WorkQueueItem[] = ((taskResult.data ?? []) as TaskRow[]).map(
    (row) => ({
      id: row.id,
      kind: "task",
      title: row.title,
      description: row.description,
      ownerRole: row.owner_role,
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_user_id ? ownerDirectory.get(row.owner_user_id)?.name ?? null : null,
      ownerInitials: row.owner_user_id ? ownerDirectory.get(row.owner_user_id)?.initials ?? null : null,
      status: row.status,
      priority: row.priority,
      dueAt: row.due_at,
      createdAt: row.created_at,
      supportPayoutCaseId: row.support_payout_case_id,
      objectHref: row.recovery_case_id
        ? `/recoveries/${row.recovery_case_id}`
        : row.loss_case_id
          ? `/losses/${row.loss_case_id}`
          : row.support_payout_case_id
            ? (
                typeof row.source_metadata?.investigation_id === "string"
                  ? `/claims/${row.support_payout_case_id}#investigation-${encodeURIComponent(row.source_metadata.investigation_id)}`
                  : `/claims/${row.support_payout_case_id}`
              )
            : null,
      objectLabel: row.recovery_case_id
        ? `Recovery ${hashId(row.recovery_case_id)}`
        : row.loss_case_id
          ? `Loss ${hashId(row.loss_case_id)}`
          : row.support_payout_case_id
            ? shortRef(null, row.support_payout_case_id)
            : "Task",
      blockingReason: row.blocking_reason,
      source: row.source,
    }),
  );
  const viewCountResult = await countWorkViews(serviceClient, ctx.merchantId, user.id, openExceptionCount);
  const viewCounts: WorkViewCounts = {
    open: viewCountResult.open,
    mine: viewCountResult.mine,
    unassigned: viewCountResult.unassigned,
    "due-today": viewCountResult["due-today"],
    overdue: viewCountResult.overdue,
    "no-sla": viewCountResult["no-sla"],
    blocked: viewCountResult.blocked,
    "evidence-needed": viewCountResult["evidence-needed"],
    "decision-needed": viewCountResult["decision-needed"],
    "integration-exceptions": viewCountResult["integration-exceptions"],
    completed: viewCountResult.completed,
  };
  const exceptions: WorkQueueItem[] = exceptionRows.map((row) => ({
    id: row.id,
    kind: "exception",
    title: row.title,
    description: row.detail,
    ownerRole: row.assigned_to ? "assigned" : null,
    ownerUserId: row.assigned_to,
    ownerName: row.assigned_to ? ownerDirectory.get(row.assigned_to)?.name ?? null : null,
    ownerInitials: row.assigned_to ? ownerDirectory.get(row.assigned_to)?.initials ?? null : null,
    status: row.status,
    priority: row.priority ?? "high",
    dueAt: row.due_at ?? null,
    createdAt: row.created_at,
    supportPayoutCaseId: row.support_payout_case_id,
    objectHref: row.support_payout_case_id
      ? `/claims/${row.support_payout_case_id}`
      : null,
    objectLabel: row.support_payout_case_id
      ? shortRef(null, row.support_payout_case_id)
      : "Integration exception",
    blockingReason: row.exception_type.replaceAll("_", " "),
    source: row.source_system ?? "automation",
    exceptionType: row.exception_type,
    exceptionContext: (row.context ?? null) as Record<string, unknown> | null,
    exceptionStateVersion: row.state_version ?? null,
  }));
  const items =
    view === "integration-exceptions" ? exceptions : [...tasks, ...exceptions];
  return (
    <WorkbenchPage
      title="Work"
      kpiItems={[
        {
          label: "Matching work",
          value: formatNumber(
            (taskResult.count ?? 0) +
              (includeExceptions ? filteredExceptionCount : 0),
          ),
          hint: "In this view",
        },
        {
          label: "Open exceptions",
          value: formatNumber(openExceptionCount),
          hint: "Merchant decisions required",
        },
      ]}
      primaryVisual={<WorkQueuePulse bands={dueBands} view={view} />}
      main={
        <WorkQueue
          items={items}
          total={
            (taskResult.count ?? 0) +
            (includeExceptions ? filteredExceptionCount : 0)
          }
          view={view}
          viewCounts={viewCounts}
          page={page}
          pageSize={pageSize}
          asOf={asOf.toISOString()}
        />
      }
    />
  );
}
