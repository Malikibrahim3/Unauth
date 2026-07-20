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
import { WorkbenchPage, KeyInsightCallout, SummaryRail } from "@/components/ui";
import { Workflow } from "lucide-react";
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
  const draftFlows = flows.filter((flow) => flow.hasDraft).length;
  const maxActionCount = Math.max(1, ...flows.map((flow) => flow.actionCount));
  const topFlows = [...flows].sort((a, b) => b.actionCount - a.actionCount).slice(0, 6);
  return (
    <WorkbenchPage
      title="Flows"
      subtitle="Route tasks, evidence, deadlines, and notifications. Test safely — nothing changes until you publish."
      kpiItems={[
        { label: 'Flows', value: formatNumber(flows.length), hint: 'Configured workflow families' },
        { label: 'Active', value: formatNumber(activeFlows), hint: 'Running published versions' },
        { label: 'Draft changes', value: formatNumber(flows.filter((flow) => flow.hasDraft).length), hint: 'Safe unpublished edits' },
      ]}
      primaryVisual={
        <KeyInsightCallout
          eyebrow="Flows"
          tone={draftFlows > 0 ? 'warning' : 'neutral'}
          icon={<Workflow size={16} />}
        >
          <strong>{formatNumber(activeFlows)}</strong> of <strong>{formatNumber(flows.length)}</strong> flows active
          {draftFlows > 0 ? <> · <strong>{formatNumber(draftFlows)}</strong> with draft changes</> : null}.
        </KeyInsightCallout>
      }
      rail={
        <SummaryRail
          sections={[
            {
              title: 'Action load',
              rows: topFlows.map((flow) => ({
                label: flow.name,
                value: formatNumber(flow.actionCount),
                tone: flow.active ? 'success' : flow.hasDraft ? 'warning' : 'neutral',
                bar: flow.actionCount / maxActionCount,
              })),
              footnote: 'Configured actions per flow — definition complexity, not execution volume.',
            },
          ]}
        />
      }
      main={<FlowsIndexClient flows={flows} canManage={canManage} />}
    />
  );
}
