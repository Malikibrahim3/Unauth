import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  hasPermission,
  PERMISSIONS,
  requirePermission,
  resolveDefaultAppPath,
} from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import {
  RulesIndexClient,
  type RuleIndexRecord,
} from "@/components/rules/RulesIndexClient";
import { WorkbenchPage } from "@/components/ui";
import { StatusMatrixChart } from "@/components/charts/authenticated";
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
  if (denied || !ctx) redirect(await resolveDefaultAppPath(service, user.id));
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
  const publishedRules = rules.filter((rule) => !rule.hasDraft && rule.publishedVersion != null).length;
  const disabledRules = Math.max(0, rules.length - draftRules - publishedRules);
  const publishedCoverage = rules.filter((rule) => rule.publishedVersion != null).length;

  return (
    <WorkbenchPage
      eyebrow="Configuration"
      title="Rules"
      subtitle="Compose readable payout policy, simulate sample cases, review conflicts and impact, then publish an immutable version. Recommendations remain non-binding."
      kpiItems={[
        { label: 'Rules', value: formatNumber(rules.length), hint: 'Active configuration families' },
        { label: 'Published', value: formatNumber(publishedCoverage), hint: 'With an immutable version' },
        { label: 'Draft changes', value: formatNumber(draftRules), hint: 'Awaiting review or publish' },
      ]}
      primaryVisual={
        <StatusMatrixChart
          id="rule-lifecycle-matrix"
          title="Rule lifecycle matrix"
          description="One cell per rule family. Draft cells may still retain an earlier published version; the KPI above shows that coverage."
          items={rules.map((rule) => ({
            label: rule.name,
            tone: rule.hasDraft ? 'orange' : rule.publishedVersion != null ? 'green' : 'neutral',
            detail: rule.hasDraft ? 'Draft change' : rule.publishedVersion != null ? 'Published current' : 'Disabled',
          }))}
          summary={[
            { label: 'Published current', value: publishedRules, tone: 'green' },
            { label: 'Draft change', value: draftRules, tone: 'orange' },
            { label: 'Disabled', value: disabledRules, tone: 'neutral' },
          ]}
        />
      }
      main={<RulesIndexClient rules={rules} canManage={canManage} />}
    />
  );
}
