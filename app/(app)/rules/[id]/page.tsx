import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  hasPermission,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import {
  RuleVersionWorkbench,
  type RuleVersionRecord,
} from "@/components/rules/RuleVersionWorkbench";
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import { SetBreadcrumbLabel } from "@/components/layout/SetBreadcrumbLabel";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";

export const dynamic = "force-dynamic";

export default async function RuleDetail({
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
    <div>
      <SetBreadcrumbLabel label={display.name} />
      <AuthenticatedPageHeader
        eyebrow="Policy configuration"
        title={display.name}
        subtitle={display.description || "No description. Add one in the next draft so operators understand intent and scope."}
      />
      <div className={pageStyles.pageBody}>
        <RuleVersionWorkbench ruleId={id} initialVersions={versions} canManage={canManage} />
      </div>
    </div>
  );
}
