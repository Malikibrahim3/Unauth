import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { WorkbenchPage, KeyInsightCallout, SummaryRail } from "@/components/ui";
import { AlertTriangle, Clock } from "lucide-react";
import { WorkQueue, type WorkQueueItem, type WorkViewCounts } from "@/components/work/WorkQueue";
import { countOpenExceptions, listExceptions } from "@/lib/exceptions/store";
import { formatNumber } from "@/lib/utils/format";
import { shortRef, hashId } from "@/lib/ui/displayRef";
import { selectDeadlineBands } from "@/lib/visualisation/chartSelectors";

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
  const pageSize = 100;
  let query = serviceClient
    .from(TABLES.WORK_TASKS)
    .select(
      "id,title,description,owner_role,owner_user_id,status,priority,due_at,created_at,source,support_payout_case_id,loss_case_id,recovery_case_id,blocking_reason",
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
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query
      .gte("due_at", start.toISOString())
      .lt("due_at", end.toISOString());
  }
  const includeExceptions =
    view === "open" || view === "integration-exceptions";
  const [taskResult, openExceptionCount, exceptionRows, countRowsResult] =
    await Promise.all([
      view === "integration-exceptions"
        ? Promise.resolve({ data: [], count: 0 })
        : query.range((page - 1) * pageSize, page * pageSize - 1),
      countOpenExceptions(serviceClient, ctx.merchantId),
      includeExceptions
        ? listExceptions(serviceClient, ctx.merchantId, {
            status: "open",
            limit: pageSize,
          })
        : Promise.resolve([]),
      serviceClient
        .from(TABLES.WORK_TASKS)
        .select("status,owner_user_id,due_at,blocking_reason,title")
        .eq("merchant_id", ctx.merchantId)
        .limit(10000),
    ]);
  const tasks: WorkQueueItem[] = ((taskResult.data ?? []) as TaskRow[]).map(
    (row) => ({
      id: row.id,
      kind: "task",
      title: row.title,
      description: row.description,
      ownerRole: row.owner_role,
      ownerUserId: row.owner_user_id,
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
            ? `/claims/${row.support_payout_case_id}`
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
  const { data: countRowsData } = countRowsResult;
  const countRows = (countRowsData ?? []) as Array<{
    status: string;
    owner_user_id: string | null;
    due_at: string | null;
    blocking_reason: string | null;
    title: string;
  }>;
  const activeRows = countRows.filter((row) => row.status !== "completed" && row.status !== "cancelled");
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
  const viewCounts: WorkViewCounts = {
    open: activeRows.length + openExceptionCount,
    mine: activeRows.filter((row) => row.owner_user_id === user.id).length,
    unassigned: activeRows.filter((row) => !row.owner_user_id).length,
    "due-today": activeRows.filter((row) => {
      const due = row.due_at ? Date.parse(row.due_at) : Number.NaN;
      return Number.isFinite(due) && due >= todayStart.getTime() && due < todayEnd.getTime();
    }).length,
    blocked: activeRows.filter((row) => row.status === "blocked").length,
    "evidence-needed": activeRows.filter((row) => row.blocking_reason?.toLowerCase().includes("evidence")).length,
    "decision-needed": activeRows.filter((row) => `${row.title} ${row.blocking_reason ?? ""}`.toLowerCase().includes("decision")).length,
    "integration-exceptions": openExceptionCount,
    completed: countRows.filter((row) => row.status === "completed").length,
  };
  const deadlineBands = selectDeadlineBands(
    activeRows.map((row) => ({ dueAt: row.due_at })),
    todayStart.getTime(),
    todayEnd.getTime(),
  );
  const exceptions: WorkQueueItem[] = exceptionRows.map((row) => ({
    id: row.id,
    kind: "exception",
    title: row.title,
    description: row.detail,
    ownerRole: row.assigned_to ? "assigned" : null,
    ownerUserId: row.assigned_to,
    status: row.status,
    priority: "high",
    dueAt: null,
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
  }));
  const items =
    view === "integration-exceptions" ? exceptions : [...tasks, ...exceptions];
  const bandTotal =
    deadlineBands.overdue +
    deadlineBands.dueToday +
    deadlineBands.upcoming +
    deadlineBands.unscheduled +
    deadlineBands.invalid;
  const deadlineTone =
    deadlineBands.overdue > 0 ? "danger" : deadlineBands.dueToday > 0 ? "warning" : "neutral";
  return (
    <WorkbenchPage
      title="Work"
      kpiItems={[
        {
          label: "Matching work",
          value: formatNumber(
            (taskResult.count ?? 0) +
              (includeExceptions ? openExceptionCount : 0),
          ),
          hint: "In this view",
        },
        {
          label: "Open exceptions",
          value: formatNumber(openExceptionCount),
          hint: "Merchant decisions required",
        },
      ]}
      primaryVisual={
        <KeyInsightCallout
          eyebrow="Deadline risk"
          tone={deadlineTone}
          icon={deadlineTone === "danger" ? <AlertTriangle size={16} /> : <Clock size={16} />}
        >
          <strong>{formatNumber(deadlineBands.overdue)}</strong> overdue and{" "}
          <strong>{formatNumber(deadlineBands.dueToday)}</strong> due today
          {deadlineBands.upcoming > 0 ? <> · {formatNumber(deadlineBands.upcoming)} upcoming</> : null}.
        </KeyInsightCallout>
      }
      rail={
        <SummaryRail
          sections={[
            {
              title: "Deadline risk",
              rows: [
                { label: "Overdue", value: formatNumber(deadlineBands.overdue), tone: "danger", bar: bandTotal ? deadlineBands.overdue / bandTotal : 0 },
                { label: "Due today", value: formatNumber(deadlineBands.dueToday), tone: "warning", bar: bandTotal ? deadlineBands.dueToday / bandTotal : 0 },
                { label: "Upcoming", value: formatNumber(deadlineBands.upcoming), tone: "info", bar: bandTotal ? deadlineBands.upcoming / bandTotal : 0 },
                { label: "No deadline", value: formatNumber(deadlineBands.unscheduled), tone: "neutral", bar: bandTotal ? deadlineBands.unscheduled / bandTotal : 0 },
                ...(deadlineBands.invalid > 0 ? [{ label: "Invalid deadline", value: formatNumber(deadlineBands.invalid), tone: "warning" as const, bar: bandTotal ? deadlineBands.invalid / bandTotal : 0 }] : []),
              ],
              footnote: "Active tasks grouped by recorded deadline. Integration exceptions are counted separately.",
            },
          ]}
        />
      }
      main={
        <WorkQueue
          items={items}
          total={
            (taskResult.count ?? 0) +
            (includeExceptions ? openExceptionCount : 0)
          }
          view={view}
          viewCounts={viewCounts}
        />
      }
    />
  );
}
