import { notFound, redirect } from "next/navigation";
import {
  hasPermission,
  PERMISSIONS,
} from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import { TABLES } from "@/lib/supabase/tables";
import {
  FlowVersionWorkbench,
  type WorkflowVersionRecord,
} from "@/components/rules/FlowVersionWorkbench";
import { SetBreadcrumbLabel } from "@/components/layout/SetBreadcrumbLabel";

export const dynamic = "force-dynamic";

export default async function FlowDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect("/overview");
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
    <section data-screen-label="Flows" data-visual-world="supplied-package" data-surface-id="flow-version-workbench" data-archetype="P8" style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
      <SetBreadcrumbLabel label={current.name} />
      <FlowVersionWorkbench
        versions={versions}
        currentId={id}
        canManage={canManage}
      />
    </section>
  );
}
