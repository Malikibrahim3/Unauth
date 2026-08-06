import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { formatDateTime } from "@/lib/utils/format";
import { DataTableServer, PageFrame, RegistrySurface } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { hashId } from "@/lib/ui/displayRef";

type WorkflowRunRow = {
  id: string;
  workflow_definition_id: string;
  status: string;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

export default async function Runs({
  searchParams,
}: {
  searchParams: Promise<{ workflow?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(
    svc,
    user.id,
    PERMISSIONS.VIEW_SETTINGS,
  );
  if (denied) redirect("/dashboard");
  const sp = await searchParams;
  let query = svc
    .from(TABLES.WORKFLOW_RUNS)
    .select("id,workflow_definition_id,status,error,started_at,completed_at")
    .eq("merchant_id", ctx.merchantId)
    .order("started_at", { ascending: false })
    .limit(100);
  if (sp.workflow) query = query.eq("workflow_definition_id", sp.workflow);
  const runs = ((await query).data ?? []) as WorkflowRunRow[];
  const scopeLabel = sp.workflow ? "for this flow" : "across all flows";

  return (
    <PageFrame
      title="Flow runs"
      subtitle="Execution history and operator-visible outcomes."
      breadcrumbs={[{ label: "Flows", href: "/flows" }, { label: "Run history" }]}
    >
      <RegistrySurface
        aria-label="Flow run history"
        toolbar={
          <Link
            href="/controls/flows"
            className="ua-text-label inline-flex h-7 items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)] focus-visible:outline-none focus-visible:shadow-[inset_var(--ua-shadow-focus)]"
          >
            All flows
          </Link>
        }
        resultCount={`${runs.length} ${runs.length === 1 ? "run" : "runs"} ${scopeLabel}`}
      >
        <DataTableServer
          aria-label="Flow run history"
          rows={runs}
          getRowKey={(run) => run.id}
          density="metadata"
          flush
          emptyState={<div className="px-4 py-12 text-center">
            <h2 className="ua-text-working-title">No flow runs in this scope</h2>
            <p className="ua-text-caption-role mt-1">Runs appear here when a published flow receives a matching trigger event.</p>
          </div>}
          columns={[
            {
              key: "run",
              header: "Run",
              render: (run) => <span className="ua-text-dense font-mono">Run {hashId(run.id)}</span>,
            },
            {
              key: "outcome",
              header: "Outcome",
              render: (run) => <StatusBadge family="workflowStatus" value={run.error ? "failed" : run.status} size="sm" />,
            },
            {
              key: "started",
              header: "Started",
              render: (run) => <span className="ua-text-dense text-[var(--ua-text-secondary)]">{formatDateTime(run.started_at)}</span>,
            },
            {
              key: "completed",
              header: "Completed",
              render: (run) => <span className="ua-text-dense text-[var(--ua-text-secondary)]">{run.completed_at ? formatDateTime(run.completed_at) : "In progress"}</span>,
            },
            {
              key: "open",
              header: "Open run",
              kind: "action",
              render: (run) => (
                <Link href={`/controls/flows/runs/${run.id}`} className="ua-text-label text-[var(--ua-action-primary)] focus-visible:outline-none focus-visible:shadow-[inset_var(--ua-shadow-focus)]">
                  Inspect<span className="sr-only"> run {hashId(run.id)}</span>
                </Link>
              ),
            },
          ]}
        />
      </RegistrySurface>
    </PageFrame>
  );
}
