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
  type RuleIndexRecord,
} from "@/components/rules/RulesIndexClient";
import { ButtonLink, PageFrame } from "@/components/ui";
import { formatNumber } from '@/lib/utils/format';
import { ControlsNav } from '@/components/rules/ControlsNav';
import type { ConditionOperator, RuleAction, RuleCondition } from '@/lib/rules-engine';
import { PayoutRulesOperations } from '@/components/rules/PayoutRulesOperations';

export const dynamic = "force-dynamic";

type RuleRow = {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  updated_at: string;
};
type RuleVersionSummary = {
  id: string;
  merchant_rule_id: string;
  version: number;
  status: string;
  name: string;
  description: string | null;
  conditions: RuleCondition[];
  action: RuleAction;
  condition_operator: ConditionOperator;
  priority: number;
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
      .select("id,merchant_rule_id,version,status,name,description,conditions,action,condition_operator,priority,created_at,published_at")
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
        name: current?.name ?? rule.name,
        description: current?.description ?? rule.description,
        priority: current?.priority ?? rule.priority,
        currentVersion: current?.version ?? null,
        currentVersionId: current?.id ?? null,
        currentStatus: (current?.status ??
          "disabled") as RuleIndexRecord["currentStatus"],
        hasDraft: Boolean(draft),
        publishedVersion: published?.version ?? null,
        updatedAt: current?.created_at ?? rule.updated_at,
        action: current?.action ?? 'manual_review',
        conditions: current?.conditions ?? [],
        conditionOperator: current?.condition_operator ?? 'and',
      };
    },
  );
  const draftRules = rules.filter((rule) => rule.hasDraft).length;
  const publishedCoverage = rules.filter((rule) => rule.publishedVersion != null).length;
  return (
    <PageFrame
      title="Payout rules"
      subtitle="Rules recommend, they never decide. A person records every merchant decision."
      meta={`${formatNumber(rules.length)} rules · ${formatNumber(publishedCoverage)} published · ${formatNumber(draftRules)} drafts`}
      tabs={<ControlsNav />}
      breadcrumbs={[{ label: 'Controls', href: '/controls/rules' }, { label: 'Payout rules' }]}
      showCurrentBreadcrumb
      actions={<><ButtonLink href={rules[0] ? `/controls/rules/${rules[0].id}?tab=history` : '/controls/rules'} variant="secondary" size="sm">Version history</ButtonLink>{canManage ? <ButtonLink href="/controls/rules?new=1" size="sm">New rule</ButtonLink> : null}</>}
      surfaceId="payout-rules-registry"
      archetype="P5"
    >
      <PayoutRulesOperations rules={rules} canManage={canManage} />
    </PageFrame>
  );
}
