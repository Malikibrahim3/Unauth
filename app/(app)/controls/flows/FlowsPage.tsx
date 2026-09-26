import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
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
import Link from 'next/link';
import {
  acceptanceScenarioFromHeaders,
  throwForAcceptanceScenario,
} from '@/lib/testing/acceptanceStateInjector';

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
  await throwForAcceptanceScenario('flows-error');
  const acceptanceScenario = await acceptanceScenarioFromHeaders();
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
  if (rowsResult.error || runsResult.error) throw new Error('Flow registry unavailable. Definitions and run counts could not be verified.');
  const recentRuns = (runsResult.data ?? []) as FlowRunRow[];
  const families = new Map<string, FlowRow[]>();
  const rows = acceptanceScenario === 'flows-empty-state'
    ? []
    : (rowsResult.data ?? []) as FlowRow[];
  for (const row of rows)
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
  const runCount = flows.reduce((total, flow) => total + flow.runCount, 0);
  const heldCount = flows.reduce((total, flow) => total + flow.heldCount, 0);
  return (
    <>
      <SetBreadcrumbLabel label="Flows" detail={`${flows.length} flow families · ${runCount} runs in the last 30 days · ${heldCount} waiting`} />
      <h1 data-reference-ignore="accessibility-heading" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Flows</h1>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#1c1f23' }}>{runCount}</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>runs in 30 days</span></div>
        <div style={{ width: 1, height: 22, background: '#eae8e5' }}/>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#64686d' }}>—</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>recovered through flows</span></div>
        <div style={{ width: 1, height: 22, background: '#eae8e5' }}/>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: heldCount ? '#c98a1a' : '#40454a' }}>{heldCount}</span><span style={{ font: "400 11.5px/1 'Inter',sans-serif", color: '#64686d' }}>runs waiting</span></div>
        <div style={{ flex: 1 }}/>
        <Link href="/controls/flows/runs" style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>View activity</Link>
        {canManage ? <Link href="/controls/flows?new=1" style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>New flow</Link> : null}
      </div>
      <FlowsIndexClient flows={flows} canManage={canManage} />
    </>
  );
}
