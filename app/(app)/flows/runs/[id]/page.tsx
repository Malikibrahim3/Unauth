import { notFound, redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/requestContext";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { formatDateTime } from "@/lib/utils/format";
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import { AuthenticatedPanel } from "@/components/authenticated/AuthenticatedPanel";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";
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
        eyebrow="Execution detail"
        title="Flow run"
        subtitle={`Started ${formatDateTime(run.started_at)}`}
        breadcrumbs={[{ label: "Flows", href: "/flows" }, { label: "Run history", href: "/flows/runs" }, { label: id }]}
      />
      <div className={pageStyles.pageBody}>
        <div className="grid gap-3">
          <AuthenticatedPanel title="Run summary">
            <dl className="grid sm:grid-cols-3">
              {[
                ["Status", String(run.status)],
                ["Event", String(run.domain_event_id ?? "Unavailable")],
                ["Started", formatDateTime(run.started_at)],
              ].map(([label, value], index) => (
                <div key={label} className={`min-w-0 p-4 ${index ? "border-t border-[var(--border-muted)] sm:border-l sm:border-t-0" : ""}`}>
                  <dt className="text-[10px] font-medium text-[var(--text-tertiary)]">{label}</dt>
                  <dd className="mt-1 break-all text-xs font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </AuthenticatedPanel>
          {run.error ? <p role="alert" className="rounded-[var(--ua-radius-card)] border border-[var(--danger)] bg-[var(--danger-bg)] p-3 text-xs">{run.error}</p> : null}
          <AuthenticatedPanel title="Execution steps" description={`${steps.length} recorded ${steps.length === 1 ? "step" : "steps"}.`}>
            <ol className="divide-y divide-[var(--border-muted)]">
              {steps.map((s: any) => (
                <li key={s.id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-xs">Step {s.step_index + 1}: {s.output_type}</strong>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">{s.status}</span>
                  </div>
                  {s.error ? <p role="alert" className="mt-2 text-xs text-[var(--danger)]">{s.error}</p> : null}
                  <pre className="mt-3 max-h-64 overflow-auto rounded-[var(--ua-radius-input)] border border-[var(--border-muted)] bg-[var(--surface-sunken)] p-3 text-[10px] leading-4">{JSON.stringify(s.result, null, 2)}</pre>
                </li>
              ))}
            </ol>
          </AuthenticatedPanel>
        </div>
      </div>
    </div>
  );
}
