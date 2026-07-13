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

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <header>
        <p className="text-sm text-[var(--text-secondary)]">Configuration</p>
        <h1 className="mt-1 text-2xl font-semibold">Rules</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
          Compose readable payout policy, simulate sample cases, review
          conflicts and impact, then publish an immutable version.
          Recommendations remain non-binding.
        </p>
      </header>
      <RulesIndexClient rules={rules} canManage={canManage} />
    </main>
  );
}
