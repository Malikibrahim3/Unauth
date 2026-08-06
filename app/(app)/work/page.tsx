import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, hasPermission, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { ButtonLink, WorkbenchPage } from "@/components/ui";
import { WorkQueue, type WorkQueueItem, type WorkViewCounts } from "@/components/work/WorkQueue";
import { WorkQueuePulse } from "@/components/work/WorkQueuePulse";
import {
  countOpenExceptionDueBands,
  listExceptions,
} from "@/lib/exceptions/store";
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
  searchParams: Promise<{ view?: string; page?: string; q?: string }>;
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
  const searchQuery = params.q?.slice(0, 160) ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;
  const asOf = now();
  const todayStart = new Date(asOf);
  todayStart.setUTCHours(0, 0, 0, 0);
  const dayAfterToday = new Date(todayStart);
  dayAfterToday.setUTCDate(dayAfterToday.getUTCDate() + 1);
  const dayFour = new Date(todayStart);
  dayFour.setUTCDate(dayFour.getUTCDate() + 4);
  const dayEight = new Date(todayStart);
  dayEight.setUTCDate(dayEight.getUTCDate() + 8);
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
    query = query
      .gte("due_at", asOf.toISOString())
      .lt("due_at", dayAfterToday.toISOString());
  }
  if (view === "overdue") query = query.lt("due_at", asOf.toISOString());
  if (view === "no-sla") query = query.is("due_at", null);
  /*
   * Deadline bands selected from the queue pulse (§6.8). These are presentation
   * filters on this route using the same boundaries as the server aggregate, so
   * a band's count and its filtered row set always agree.
   */
  if (view === "due-1-3" || view === "due-4-7" || view === "due-later") {
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
    view === "open"
    || view === "integration-exceptions"
    || view === "overdue"
    || view === "due-today"
    || view === "due-1-3"
    || view === "due-4-7"
    || view === "due-later"
    || view === "no-sla";
  let exceptionDeadline: {
    dueBefore?: string;
    dueAfter?: string;
    dueIsNull?: boolean;
  } = {};
  if (view === "overdue") exceptionDeadline = { dueBefore: asOf.toISOString() };
  else if (view === "due-today") {
    exceptionDeadline = {
      dueAfter: asOf.toISOString(),
      dueBefore: dayAfterToday.toISOString(),
    };
  } else if (view === "due-1-3") {
    exceptionDeadline = {
      dueAfter: dayAfterToday.toISOString(),
      dueBefore: dayFour.toISOString(),
    };
  } else if (view === "due-4-7") {
    exceptionDeadline = {
      dueAfter: dayFour.toISOString(),
      dueBefore: dayEight.toISOString(),
    };
  } else if (view === "due-later") exceptionDeadline = { dueAfter: dayEight.toISOString() };
  else if (view === "no-sla") exceptionDeadline = { dueIsNull: true };
  const [
    taskResult,
    exceptionRows,
    ownerDirectory,
    taskDueBands,
    exceptionDueBands,
    canAssign,
  ] =
    await Promise.all([
      view === "integration-exceptions"
        ? Promise.resolve({ data: [], count: 0 })
        : query.range((page - 1) * pageSize, page * pageSize - 1),
      includeExceptions
        ? listExceptions(serviceClient, ctx.merchantId, {
            status: "open",
            limit: pageSize,
            offset: (page - 1) * pageSize,
            ...exceptionDeadline,
          })
        : Promise.resolve([]),
      loadWorkOwnerDirectory(serviceClient, ctx.merchantId),
      countWorkDueBands(serviceClient, ctx.merchantId, asOf),
      countOpenExceptionDueBands(serviceClient, ctx.merchantId, asOf),
      hasPermission(serviceClient, ctx, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS),
    ]);
  const openExceptionCount = Object.values(exceptionDueBands).reduce((sum, count) => sum + count, 0);
  const exceptionViewCounts: Record<string, number> = {
    open: openExceptionCount,
    "integration-exceptions": openExceptionCount,
    overdue: exceptionDueBands.overdue,
    "due-today": exceptionDueBands["due-today"],
    "due-1-3": exceptionDueBands["due-1-3"],
    "due-4-7": exceptionDueBands["due-4-7"],
    "due-later": exceptionDueBands["due-later"],
    "no-sla": exceptionDueBands["no-sla"],
  };
  const filteredExceptionCount = includeExceptions ? exceptionViewCounts[view] ?? 0 : 0;
  const dueBands = {
    overdue: taskDueBands.overdue + exceptionDueBands.overdue,
    "due-today": taskDueBands["due-today"] + exceptionDueBands["due-today"],
    "due-1-3": taskDueBands["due-1-3"] + exceptionDueBands["due-1-3"],
    "due-4-7": taskDueBands["due-4-7"] + exceptionDueBands["due-4-7"],
    "due-later": taskDueBands["due-later"] + exceptionDueBands["due-later"],
    "no-sla": taskDueBands["no-sla"] + exceptionDueBands["no-sla"],
  };
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
        ? `/financials/recovery/${row.recovery_case_id}`
        : row.loss_case_id
          ? `/financials/losses/${row.loss_case_id}`
          : row.support_payout_case_id
            ? (
                typeof row.source_metadata?.investigation_id === "string"
                  ? `/cases/${row.support_payout_case_id}#investigation-${encodeURIComponent(row.source_metadata.investigation_id)}`
                  : `/cases/${row.support_payout_case_id}`
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
    "due-today": dueBands["due-today"],
    overdue: dueBands.overdue,
    "no-sla": dueBands["no-sla"],
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
      ? `/cases/${row.support_payout_case_id}`
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
  const matchingWork =
    (taskResult.count ?? 0) +
    (includeExceptions ? filteredExceptionCount : 0);
  const viewLabel = {
    open: "Open work",
    mine: "My work",
    unassigned: "Unassigned work",
    "due-today": "Due today",
    overdue: "Overdue work",
    "no-sla": "No-deadline work",
    blocked: "Blocked work",
    "evidence-needed": "Evidence needed",
    "decision-needed": "Decision needed",
    "integration-exceptions": "Integration exceptions",
    completed: "Completed work",
  }[view] ?? "Matching work";
  const deadlineRisk = dueBands.overdue + dueBands["due-today"];
  return (
    <WorkbenchPage
      eyebrow="Operations"
      title="Work"
      subtitle={`${formatNumber(matchingWork)} ${viewLabel.toLowerCase()} · ${formatNumber(deadlineRisk)} overdue or due today`}
      actions={canAssign ? <ButtonLink href="/work?view=unassigned" size="sm">Assign next safe item</ButtonLink> : null}
      main={
        <WorkQueue
          items={items}
          total={matchingWork}
          view={view}
          viewCounts={viewCounts}
          page={page}
          pageSize={pageSize}
          asOf={asOf.toISOString()}
          initialQuery={searchQuery}
          forecast={<WorkQueuePulse bands={dueBands} view={view} query={searchQuery} blocked={viewCounts.blocked} unassigned={viewCounts.unassigned} />}
        />
      }
      mainSurface="open"
    />
  );
}
