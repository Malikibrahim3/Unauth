import Link from "next/link";
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
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";
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
    <div>
      <AuthenticatedPageHeader
        title={current.name}
        subtitle={current.description || "No operator-facing description yet. Add intent and expected work in the next draft."}
        breadcrumbs={[{ label: "Flows", href: "/flows" }, { label: current.name }]}
        actions={
        <Link
          href={`/flows/runs?workflow=${id}`}
          className="inline-flex h-7 items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 text-[length:var(--ua-text-micro-size)] font-semibold hover:bg-[var(--ua-surface-hover)]"
        >
          Run history
        </Link>
        }
      />
      <div className={pageStyles.pageBody}>
        <FlowVersionWorkbench
          versions={versions}
          currentId={id}
          canManage={canManage}
          publicationEnabled={env.WORKFLOW_PUBLICATION_ENABLED === "true"}
        />
      </div>
    </div>
  );
}
