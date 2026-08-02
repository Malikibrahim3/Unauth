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
import { PageFrame } from "@/components/ui/PageFrame";
import { env } from "@/lib/utils/env";

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
  if (!ctx) redirect("/dashboard");
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
    <PageFrame>
      <SetBreadcrumbLabel label={current.name} />
      <div className="pt-5">
        <FlowVersionWorkbench
          versions={versions}
          currentId={id}
          canManage={canManage}
          publicationEnabled={env.WORKFLOW_PUBLICATION_ENABLED === "true"}
        />
      </div>
    </PageFrame>
  );
}
