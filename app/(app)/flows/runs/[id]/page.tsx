import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { formatDateTime } from "@/lib/utils/format";
import { PageFrame, Surface } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { hashId } from "@/lib/ui/displayRef";

type WorkflowRun = {
  id: string;
  domain_event_id: string;
  status: string;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

type WorkflowStepRun = {
  id: string;
  step_index: number;
  output_type: string;
  status: string;
  result: unknown;
  error: string | null;
  completed_at: string | null;
};

function readableAction(value: string) {
  return value.replaceAll("_", " ");
}

function payloadText(payload: unknown) {
  try {
    return JSON.stringify(payload ?? {}, null, 2);
  } catch {
    return "Payload could not be displayed.";
  }
}

export default async function Run({
  params,
}: {
  params: Promise<{ id: string }>;
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
  const { id } = await params;
  const run = (
    await svc
      .from(TABLES.WORKFLOW_RUNS)
      .select("id,domain_event_id,status,error,started_at,completed_at")
      .eq("merchant_id", ctx.merchantId)
      .eq("id", id)
      .maybeSingle()
  ).data as WorkflowRun | null;
  if (!run) notFound();
  const steps = ((
    await svc
      .from(TABLES.WORKFLOW_STEP_RUNS)
      .select("id,step_index,output_type,status,result,error,completed_at")
      .eq("merchant_id", ctx.merchantId)
      .eq("workflow_run_id", id)
      .order("step_index")
  ).data ?? []) as WorkflowStepRun[];

  return (
    <PageFrame
      title={`Run ${hashId(run.id)}`}
      subtitle={`Started ${formatDateTime(run.started_at)}`}
      breadcrumbs={[
        { label: "Flows", href: "/flows" },
        { label: "Run history", href: "/flows/runs" },
        { label: `Run ${hashId(run.id)}` },
      ]}
      actions={
        <Link
          href="/flows/runs"
          className="inline-flex h-7 items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)] focus-visible:outline-none focus-visible:shadow-[inset_var(--ua-shadow-focus)]"
        >
          Run history
        </Link>
      }
    >
      <div className="space-y-4">
        <Surface structure="working" as="section" aria-labelledby="run-summary-title">
          <div className="border-b border-[var(--ua-border-subtle)] px-4 py-3">
            <h2 id="run-summary-title" className="text-sm font-semibold">Run summary</h2>
          </div>
          <dl className="grid sm:grid-cols-4">
            <div className="min-w-0 p-4">
              <dt className="text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-tertiary)]">Outcome</dt>
              <dd className="mt-2"><StatusBadge family="workflowStatus" value={run.error ? "failed" : run.status} size="sm" /></dd>
            </div>
            <div className="min-w-0 border-t border-[var(--ua-border-subtle)] p-4 sm:border-l sm:border-t-0">
              <dt className="text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-tertiary)]">Trigger event</dt>
              <dd className="mt-1 font-mono text-xs">Event {hashId(run.domain_event_id)}</dd>
            </div>
            <div className="min-w-0 border-t border-[var(--ua-border-subtle)] p-4 sm:border-l sm:border-t-0">
              <dt className="text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-tertiary)]">Started</dt>
              <dd className="mt-1 text-xs">{formatDateTime(run.started_at)}</dd>
            </div>
            <div className="min-w-0 border-t border-[var(--ua-border-subtle)] p-4 sm:border-l sm:border-t-0">
              <dt className="text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-tertiary)]">Completed</dt>
              <dd className="mt-1 text-xs">{run.completed_at ? formatDateTime(run.completed_at) : "In progress"}</dd>
            </div>
          </dl>
        </Surface>

        {run.error ? (
          <div role="alert" className="border border-[var(--ua-risk-critical-border)] bg-[var(--ua-risk-critical-bg)] px-4 py-3 text-sm text-[var(--ua-risk-critical)]">
            <strong>Run failed:</strong> {run.error}
          </div>
        ) : null}

        <Surface structure="working" as="section" aria-labelledby="execution-steps-title">
          <div className="border-b border-[var(--ua-border-subtle)] px-4 py-3">
            <h2 id="execution-steps-title" className="text-sm font-semibold">Execution steps</h2>
            <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">{steps.length} recorded {steps.length === 1 ? "step" : "steps"} in execution order.</p>
          </div>
          {steps.length ? (
            <ol className="divide-y divide-[var(--ua-border-subtle)]">
              {steps.map((step) => (
                <li key={step.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{step.step_index + 1}. {readableAction(step.output_type)}</p>
                      <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
                        {step.completed_at ? `Recorded ${formatDateTime(step.completed_at)}` : "Awaiting completion"}
                      </p>
                    </div>
                    <StatusBadge family="workflowStatus" value={step.error ? "failed" : step.status} size="sm" />
                  </div>
                  {step.error ? <p role="alert" className="mt-3 text-sm text-[var(--ua-risk-critical)]">{step.error}</p> : null}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-[var(--ua-text-secondary)] focus-visible:outline-none focus-visible:shadow-[inset_var(--ua-shadow-focus)]">Raw step result</summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3 text-xs leading-5 text-[var(--ua-text-secondary)]">{payloadText(step.result)}</pre>
                  </details>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-[var(--ua-text-secondary)]">This run did not record any action steps.</p>
          )}
        </Surface>
      </div>
    </PageFrame>
  );
}
