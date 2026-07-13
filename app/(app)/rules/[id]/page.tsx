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
  RuleVersionWorkbench,
  type RuleVersionRecord,
} from "@/components/rules/RuleVersionWorkbench";

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
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <Link
        href="/rules"
        className="text-sm font-semibold text-[var(--accent)]"
      >
        ← Rules
      </Link>
      <header>
        <p className="text-sm text-[var(--text-secondary)]">
          Policy configuration
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          {display.name}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
          {display.description ||
            "No description. Add one in the next draft so operators understand intent and scope."}
        </p>
      </header>
      <RuleVersionWorkbench
        ruleId={id}
        initialVersions={versions}
        canManage={canManage}
      />
    </main>
  );
}
