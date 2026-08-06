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
  RuleVersionWorkbench,
  type RuleVersionRecord,
} from "@/components/rules/RuleVersionWorkbench";
import { SetBreadcrumbLabel } from "@/components/layout/SetBreadcrumbLabel";
import { PageFrame } from "@/components/ui/PageFrame";

export const dynamic = "force-dynamic";

export default async function RuleDetail({
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
  const [ruleResult, versionsResult] = await Promise.all([
    service
      .from(TABLES.MERCHANT_RULES)
      .select("id,name,description")
      .eq("merchant_id", ctx.merchantId)
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle(),
    service
      .from(TABLES.MERCHANT_RULE_VERSIONS)
      .select("*")
      .eq("merchant_id", ctx.merchantId)
      .eq("merchant_rule_id", id)
      .order("version", { ascending: false }),
  ]);
  if (!ruleResult.data) notFound();
  const canManage = await hasPermission(
    service,
    ctx,
    PERMISSIONS.MANAGE_SETTINGS,
  );
  const versions = (versionsResult.data ??
    []) as unknown as RuleVersionRecord[];
  if (versions.length === 0) notFound();
  const display =
    versions.find((version) => version.status === "draft") ??
    versions.find((version) => version.status === "published") ??
    versions[0]!;

  return (
    <PageFrame>
      <SetBreadcrumbLabel label={display.name} />
      <div className="pt-5">
        <RuleVersionWorkbench ruleId={id} initialVersions={versions} canManage={canManage} />
      </div>
    </PageFrame>
  );
}
