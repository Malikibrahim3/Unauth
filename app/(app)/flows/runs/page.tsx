import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import { formatDateTime } from "@/lib/utils/format";
export default async function Runs({
  searchParams,
}: {
  searchParams: Promise<{ workflow?: string }>;
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
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <Link href="/flows" className="text-sm text-[var(--accent)]">
        Flows
      </Link>
      <h1 className="text-2xl font-semibold">Flow runs</h1>
      <div className="divide-y border-y">
        {runs.map((r: any) => (
          <Link
            key={r.id}
            href={`/flows/runs/${r.id}`}
            className="grid gap-2 py-3 sm:grid-cols-4"
          >
            <span className="font-mono text-xs">{r.id}</span>
            <span>{r.status}</span>
            <span>{formatDateTime(r.started_at)}</span>
            <span>{r.error ? "Failed — inspect" : "Inspect"}</span>
          </Link>
        ))}
      </div>
      {!runs.length ? <p>No flow runs found for this scope.</p> : null}
    </div>
  );
}
