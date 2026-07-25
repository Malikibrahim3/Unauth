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
import { WorkbenchPage, KeyInsightCallout, SummaryRail } from "@/components/ui";
import { ShieldCheck } from "lucide-react";
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
  const publishedRules = rules.filter((rule) => !rule.hasDraft && rule.publishedVersion != null).length;
  const disabledRules = Math.max(0, rules.length - draftRules - publishedRules);
  const publishedCoverage = rules.filter((rule) => rule.publishedVersion != null).length;

  return (
    <WorkbenchPage
      title="Rules"
      subtitle="Compose readable payout policy, simulate sample cases, review conflicts and impact, then publish an immutable version. Recommendations remain non-binding."
      kpiItems={[
        { label: 'Rules', value: formatNumber(rules.length), hint: 'Active payout rules' },
        { label: 'Published', value: formatNumber(publishedCoverage), hint: 'With an immutable version' },
        { label: 'Draft changes', value: formatNumber(draftRules), hint: 'Awaiting review or publish' },
      ]}
      primaryVisual={
        <KeyInsightCallout
          tone={draftRules > 0 ? 'warning' : publishedCoverage > 0 ? 'success' : 'neutral'}
          icon={<ShieldCheck size={16} />}
        >
          <strong>{formatNumber(publishedCoverage)}</strong> of <strong>{formatNumber(rules.length)}</strong> rules published
          {draftRules > 0 ? <> · <strong>{formatNumber(draftRules)}</strong> with draft changes awaiting review</> : null}.
        </KeyInsightCallout>
      }
      rail={
        <SummaryRail
          sections={[
            {
              title: 'Rule lifecycle',
              rows: [
                { label: 'Published current', value: formatNumber(publishedRules), tone: 'success', bar: rules.length ? publishedRules / rules.length : 0 },
                { label: 'Draft change', value: formatNumber(draftRules), tone: 'warning', bar: rules.length ? draftRules / rules.length : 0 },
                { label: 'Disabled', value: formatNumber(disabledRules), tone: 'neutral', bar: rules.length ? disabledRules / rules.length : 0 },
              ],
              footnote: 'One row per rule family. Draft families may retain an earlier published version.',
            },
          ]}
        />
      }
      main={<RulesIndexClient rules={rules} canManage={canManage} />}
    />
  );
}
