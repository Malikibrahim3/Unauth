import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  hasPermission,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import {
  FlowVersionWorkbench,
  type WorkflowVersionRecord,
} from "@/components/rules/FlowVersionWorkbench";

export const dynamic = "force-dynamic";

export default async function FlowDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.VIEW_SETTINGS,
  );
  if (denied || !ctx) redirect("/dashboard");
  const { id } = await params;
  const current = (
    await service
      .from(TABLES.WORKFLOW_DEFINITIONS)
      .select("*")
      .eq("merchant_id", ctx.merchantId)
      .eq("id", id)
      .maybeSingle()
  ).data;
  if (!current) notFound();
  const [versionsResult, canManage] = await Promise.all([
    service
      .from(TABLES.WORKFLOW_DEFINITIONS)
      .select("*")
      .eq("merchant_id", ctx.merchantId)
      .eq("name", current.name)
      .order("version", { ascending: false }),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  const versions = (versionsResult.data ??
    []) as unknown as WorkflowVersionRecord[];
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/flows"
          className="text-sm font-semibold text-[var(--accent)]"
        >
          ← Flows
        </Link>
        <Link
          href={`/flows/runs?workflow=${id}`}
          className="text-sm font-semibold text-[var(--accent)]"
        >
          Run history →
        </Link>
      </div>
      <header>
        <p className="text-sm text-[var(--text-secondary)]">
          Workflow configuration
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{current.name}</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
          {current.description ||
            "No operator-facing description yet. Add intent and expected work in the next draft."}
        </p>
      </header>
      <FlowVersionWorkbench
        versions={versions}
        currentId={id}
        canManage={canManage}
      />
    </main>
  );
}
