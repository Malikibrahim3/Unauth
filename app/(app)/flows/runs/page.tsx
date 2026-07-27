import Link from "next/link";
import { redirect } from "next/navigation";
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
  let q = svc
    .from(TABLES.WORKFLOW_RUNS)
    .select("*")
    .eq("merchant_id", ctx.merchantId)
    .order("started_at", { ascending: false })
    .limit(100);
  if (sp.workflow) q = q.eq("workflow_definition_id", sp.workflow);
  const runs = (await q).data ?? [];
  return (
    <div>
      <AuthenticatedPageHeader
        title="Flow runs"
        subtitle="Execution history and operator-visible outcomes."
        breadcrumbs={[{ label: "Flows", href: "/flows" }, { label: "Run history" }]}
      />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel title="Recent runs" description="Up to 100 executions in this scope.">
          <div className="divide-y divide-[var(--ua-border-subtle)]">
        {runs.map((r: any) => (
          <Link
            key={r.id}
            href={`/flows/runs/${r.id}`}
            className="grid min-h-12 items-center gap-2 px-4 py-2.5 text-[length:var(--ua-text-micro-size)] hover:bg-[var(--ua-surface-hover)] sm:grid-cols-4"
          >
            <span className="font-mono text-xs">Run {hashId(r.id)}</span>
            <span>{label("workflowStatus", String(r.status ?? "unknown"))}</span>
            <span className="text-[var(--ua-text-secondary)]">{formatDateTime(r.started_at)}</span>
            <span className="text-right font-semibold text-[var(--ua-text-secondary)]">{r.error ? "Failed — inspect" : "Inspect"}</span>
          </Link>
        ))}
          </div>
          {!runs.length ? <p className="px-4 py-10 text-center text-xs text-[var(--ua-text-secondary)]">No flow runs found for this scope.</p> : null}
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
