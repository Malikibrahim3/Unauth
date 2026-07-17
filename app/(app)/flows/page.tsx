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
  FlowsIndexClient,
  type FlowIndexRecord,
} from "@/components/rules/FlowsIndexClient";
import { WorkbenchPage } from "@/components/ui";
import { MiniBarSequenceChart } from "@/components/charts/authenticated";
import { formatNumber } from '@/lib/utils/format';

export const dynamic = "force-dynamic";

type FlowRow = {
  id: string;
  name: string;
  description: string | null;
  trigger_event_type: string;
  active: boolean;
  version: number;
  status: string;
  outputs: unknown[] | null;
  updated_at: string;
};

export default async function FlowsPage() {
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
  const [rowsResult, canManage] = await Promise.all([
    service
      .from(TABLES.WORKFLOW_DEFINITIONS)
      .select(
        "id,name,description,trigger_event_type,active,version,status,outputs,updated_at",
      )
      .eq("merchant_id", ctx.merchantId)
      .order("name")
      .order("version", { ascending: false }),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  const families = new Map<string, FlowRow[]>();
  for (const row of (rowsResult.data ?? []) as FlowRow[])
    families.set(row.name, [...(families.get(row.name) ?? []), row]);
  const flows: FlowIndexRecord[] = [...families.entries()].map(
    ([name, family]) => {
      const rows = family ?? [];
      const draft = rows.find((row: FlowRow) => row.status === "draft");
      const published = rows.find((row: FlowRow) => row.status === "published");
      const display = draft ?? published ?? rows[0]!;
      return {
        name,
        description: display.description,
        hrefId: display.id,
        trigger: display.trigger_event_type,
        status: display.status as FlowIndexRecord["status"],
        active: published?.active ?? false,
        version: display.version,
        publishedVersion: published?.version ?? null,
        hasDraft: Boolean(draft),
        actionCount: Array.isArray(display.outputs)
          ? display.outputs.length
          : 0,
        updatedAt: display.updated_at,
      };
    },
  );
  const activeFlows = flows.filter((flow) => flow.active).length;
  return (
    <WorkbenchPage
      eyebrow="Configuration"
      title="Flows"
      subtitle="Route tasks, evidence, deadlines, and notifications. Test safely — nothing changes until you publish."
      kpiItems={[
        { label: 'Flows', value: formatNumber(flows.length), hint: 'Configured workflow families' },
        { label: 'Active', value: formatNumber(activeFlows), hint: 'Running published versions' },
        { label: 'Draft changes', value: formatNumber(flows.filter((flow) => flow.hasDraft).length), hint: 'Safe unpublished edits' },
      ]}
      primaryVisual={
        <MiniBarSequenceChart
          id="flow-action-load"
          title="Flow action load"
          description="Configured actions per workflow family. Bar height describes definition complexity, not execution volume or success."
          items={flows.map((flow) => ({
            label: flow.name,
            value: flow.actionCount,
            tone: flow.active ? 'green' : flow.hasDraft ? 'orange' : 'neutral',
            detail: flow.active ? 'Active' : flow.hasDraft ? 'Draft change' : 'Inactive',
          }))}
        />
      }
      main={<FlowsIndexClient flows={flows} canManage={canManage} />}
    />
  );
}
