import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { formatDateTime } from "@/lib/utils/format";
export default async function Run({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
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
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <Link href="/flows/runs" className="text-sm text-[var(--accent)]">
        ← Run history
      </Link>
      <h1 className="text-2xl font-semibold">Flow run</h1>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt>Status</dt>
          <dd>{run.status}</dd>
        </div>
        <div>
          <dt>Event</dt>
          <dd className="font-mono break-all">{run.domain_event_id}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{formatDateTime(run.started_at)}</dd>
        </div>
      </dl>
      {run.error ? (
        <p role="alert" className="border border-[var(--danger)] p-3">
          {run.error}
        </p>
      ) : null}
      <ol className="space-y-3">
        {steps.map((s: any) => (
          <li key={s.id} className="border p-3">
            <strong>
              Step {s.step_index + 1}: {s.output_type}
            </strong>
            <p>Status: {s.status}</p>
            {s.error ? <p role="alert">{s.error}</p> : null}
            <pre className="mt-2 overflow-auto text-xs">
              {JSON.stringify(s.result, null, 2)}
            </pre>
          </li>
        ))}
      </ol>
    </main>
  );
}
