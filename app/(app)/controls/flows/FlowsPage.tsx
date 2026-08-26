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
  FlowsIndexClient,
  type FlowIndexRecord,
} from "@/components/rules/FlowsIndexClient";
import { PageFrame } from "@/components/ui";
import { ControlsNav } from '@/components/rules/ControlsNav';
import Link from 'next/link';

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

type FlowRunRow = {
  workflow_definition_id: string;
  status: string;
  completed_at: string | null;
};

export default async function FlowsPage() {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect(await resolveDefaultAppPath(service, user.id));
  const [rowsResult, runsResult, canManage] = await Promise.all([
    service
      .from(TABLES.WORKFLOW_DEFINITIONS)
      .select(
        "id,name,description,trigger_event_type,active,version,status,outputs,updated_at",
      )
      .eq("merchant_id", ctx.merchantId)
      .order("name")
      .order("version", { ascending: false }),
    service
      .from(TABLES.WORKFLOW_RUNS)
      .select('workflow_definition_id,status,completed_at')
      .eq('merchant_id', ctx.merchantId)
      .gte('started_at', new Date(Date.now() - 30 * 86_400_000).toISOString()),
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
  ]);
  const recentRuns = (runsResult.data ?? []) as FlowRunRow[];
  const families = new Map<string, FlowRow[]>();
  for (const row of (rowsResult.data ?? []) as FlowRow[])
    families.set(row.name, [...(families.get(row.name) ?? []), row]);
  const flows: FlowIndexRecord[] = [...families.entries()].map(
    ([name, family]) => {
      const rows = family ?? [];
      const draft = rows.find((row: FlowRow) => row.status === "draft");
      const published = rows.find((row: FlowRow) => row.status === "published");
      const display = draft ?? published ?? rows[0]!;
      const familyIds = new Set(rows.map((row) => row.id));
      const flowRuns = recentRuns.filter((run) => familyIds.has(run.workflow_definition_id));
      const heldRuns = flowRuns.filter((run) => !run.completed_at || ['held', 'pending', 'waiting'].includes(run.status));
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
        runCount: flowRuns.length,
        heldCount: heldRuns.length,
        actions: Array.isArray(display.outputs)
          ? display.outputs.map((output, index) => {
              if (typeof output === 'string') return output.replaceAll('_', ' ');
              if (output && typeof output === 'object') {
                const value = output as Record<string, unknown>;
                const label = value.label ?? value.action ?? value.type ?? value.kind;
                if (typeof label === 'string') return label.replaceAll('_', ' ');
              }
              return `Bounded action ${index + 1}`;
            })
          : [],
      };
    },
  );
  return (
    <PageFrame
      title="Flows"
      subtitle="Flows move work, they don't decide outcomes."
      meta="A pilot flow draft can plan tasks, evidence requests, deadlines and in-app notifications. It never contacts a provider, submits recovery, decides an outcome or moves money."
      tabs={<ControlsNav />}
      surfaceId="flows-registry"
      archetype="P5"
      actions={
        <div className="uo-header-actions">
          <Link href="/controls/flows/runs" className="ua-button ua-button--secondary ua-button--sm">View activity</Link>
          {canManage ? <Link href="/controls/flows?new=1" className="ua-button ua-button--primary ua-button--sm">New flow</Link> : null}
        </div>
      }
    >
        <FlowsIndexClient
          flows={flows}
          canManage={canManage}
        />
    </PageFrame>
  );
}
