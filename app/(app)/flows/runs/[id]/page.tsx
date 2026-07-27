import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { formatDateTime } from "@/lib/utils/format";
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import { AuthenticatedPanel } from "@/components/authenticated/AuthenticatedPanel";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";
import { hashId } from "@/lib/ui/displayRef";
import { label } from "@/lib/ui/labels";
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
      .select("*")
      .eq("merchant_id", ctx.merchantId)
      .eq("id", id)
      .maybeSingle()
  ).data as any;
  if (!run) notFound();
  const steps =
    (
      await svc
        .from(TABLES.WORKFLOW_STEP_RUNS)
        .select("*")
        .eq("merchant_id", ctx.merchantId)
        .eq("workflow_run_id", id)
        .order("step_index")
    ).data ?? [];
  return (
    <div>
      <AuthenticatedPageHeader
        title="Flow run"
        subtitle={`Started ${formatDateTime(run.started_at)}`}
        breadcrumbs={[{ label: "Flows", href: "/flows" }, { label: "Run history", href: "/flows/runs" }, { label: `Run ${hashId(id)}` }]}
      />
      <div className={pageStyles.pageBody}>
        <div className="grid gap-3">
          <AuthenticatedPanel title="Run summary">
            <dl className="grid sm:grid-cols-3">
              {[
                ["Status", label("workflowStatus", String(run.status ?? "unknown"))],
                ["Event", run.domain_event_id ? `Event ${hashId(run.domain_event_id)}` : "Unavailable"],
                ["Started", formatDateTime(run.started_at)],
              ].map(([label, value], index) => (
                <div key={label} className={`min-w-0 p-4 ${index ? "border-t border-[var(--ua-border-subtle)] sm:border-l sm:border-t-0" : ""}`}>
                  <dt className="text-[length:var(--ua-text-micro-size)] font-medium text-[var(--ua-text-tertiary)]">{label}</dt>
                  <dd className="mt-1 break-all text-xs font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </AuthenticatedPanel>
          {run.error ? <p role="alert" className="rounded-[var(--ua-radius-surface)] border border-[var(--ua-critical)] bg-[var(--ua-critical-bg)] p-3 text-xs">{run.error}</p> : null}
          <AuthenticatedPanel title="Execution steps" description={`${steps.length} recorded ${steps.length === 1 ? "step" : "steps"}.`}>
            <ol className="divide-y divide-[var(--ua-border-subtle)]">
              {steps.map((s: any) => (
                <li key={s.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-xs">Step {s.step_index + 1}: {label("workflowStatus", String(s.output_type ?? "action"))}</strong>
                    <span className="text-[length:var(--ua-text-micro-size)] font-semibold text-[var(--ua-text-tertiary)]">{label("workflowStatus", String(s.status ?? "unknown"))}</span>
                  </div>
                  {s.error ? <p role="alert" className="mt-2 text-xs text-[var(--ua-critical)]">{s.error}</p> : null}
                  <pre className="mt-3 max-h-64 overflow-auto rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3 text-[length:var(--ua-text-micro-size)] leading-4">{JSON.stringify(s.result, null, 2)}</pre>
                </li>
              ))}
            </ol>
          </AuthenticatedPanel>
        </div>
      </div>
    </div>
  );
}
