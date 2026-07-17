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
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";

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
    <div>
      <AuthenticatedPageHeader
        eyebrow="Workflow configuration"
        title={current.name}
        subtitle={current.description || "No operator-facing description yet. Add intent and expected work in the next draft."}
        breadcrumbs={[{ label: "Flows", href: "/flows" }, { label: current.name }]}
        actions={
        <Link
          href={`/flows/runs?workflow=${id}`}
          className="inline-flex h-7 items-center rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-semibold shadow-[var(--shadow-xs)] hover:bg-[var(--surface-hover)]"
        >
          Run history
        </Link>
        }
      />
      <div className={pageStyles.pageBody}>
        <FlowVersionWorkbench versions={versions} currentId={id} canManage={canManage} />
      </div>
    </div>
  );
}
