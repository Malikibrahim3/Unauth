import { redirect } from "next/navigation";
import {
  hasPermission,
  PERMISSIONS,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import { TABLES } from "@/lib/supabase/tables";
import {
  RulesIndexClient,
  type RuleIndexRecord,
} from "@/components/rules/RulesIndexClient";
import { PageFrame } from "@/components/ui";
import { formatNumber } from '@/lib/utils/format';

export const dynamic = "force-dynamic";

type RuleRow = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  updated_at: string;
};
type RuleVersionSummary = {
  merchant_rule_id: string;
  version: number;
  status: string;
  created_at: string;
  published_at: string | null;
};

export default async function RulesPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect(await resolveDefaultAppPath(service, user.id));
  const [rulesResult, versionsResult, canManage] = await Promise.all([
    service
      .from(TABLES.MERCHANT_RULES)
      .select("id,name,description,priority,updated_at")
      .eq("merchant_id", ctx.merchantId)
      .is("archived_at", null)
      .order("priority"),
    service
      .from(TABLES.MERCHANT_RULE_VERSIONS)
      .select("merchant_rule_id,version,status,created_at,published_at")
      .eq("merchant_id", ctx.merchantId)
      .order("version", { ascending: false }),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  const versions = (versionsResult.data ?? []) as RuleVersionSummary[];
  const rules: RuleIndexRecord[] = ((rulesResult.data ?? []) as RuleRow[]).map(
    (rule) => {
      const history = versions.filter(
        (version: RuleVersionSummary) => version.merchant_rule_id === rule.id,
      );
      const draft = history.find((version) => version.status === "draft");
      const published = history.find(
        (version) => version.status === "published",
      );
      const current = draft ?? published ?? history[0];
      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        currentVersion: current?.version ?? null,
        currentStatus: (current?.status ??
          "disabled") as RuleIndexRecord["currentStatus"],
        hasDraft: Boolean(draft),
        publishedVersion: published?.version ?? null,
        updatedAt: current?.created_at ?? rule.updated_at,
      };
    },
  );
  const draftRules = rules.filter((rule) => rule.hasDraft).length;
  const publishedCoverage = rules.filter((rule) => rule.publishedVersion != null).length;

  return (
    <PageFrame
      title="Rules"
      subtitle={`Set the policy that guides recommendations · ${formatNumber(rules.length)} rules · ${formatNumber(publishedCoverage)} published · ${formatNumber(draftRules)} drafts`}
    >
      <RulesIndexClient rules={rules} canManage={canManage} />
    </PageFrame>
  );
}
