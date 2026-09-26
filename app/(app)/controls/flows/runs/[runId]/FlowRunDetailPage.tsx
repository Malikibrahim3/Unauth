import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { FlowRunTrace, type FlowRunTraceData } from '@/components/rules/FlowRunTrace';
import { hashId } from '@/lib/ui/displayRef';
import { redactSensitiveData } from '@/lib/log/redactSensitiveData';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';

export default async function Run({ params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const svc = createServiceClient();
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/overview');
  const { id } = await params;
  const runResult = await svc.from(TABLES.WORKFLOW_RUNS).select('id,domain_event_id,workflow_definition_id,status,error,started_at,completed_at').eq('merchant_id',ctx.merchantId).eq('id',id).maybeSingle();
  if (runResult.error) throw new Error(`Unable to load flow run: ${runResult.error.message}`);
  if (!runResult.data) notFound();
  const run = runResult.data;
  const [stepsResult, flowResult, eventResult] = await Promise.all([
    svc.from(TABLES.WORKFLOW_STEP_RUNS).select('id,step_index,output_type,status,result,error,created_at,completed_at').eq('merchant_id',ctx.merchantId).eq('workflow_run_id',id).order('step_index'),
    svc.from(TABLES.WORKFLOW_DEFINITIONS).select('id,name,version,status,trigger_event_type,outputs').eq('merchant_id',ctx.merchantId).eq('id',run.workflow_definition_id).maybeSingle(),
    svc.from(TABLES.DOMAIN_EVENTS).select('event_type,occurred_at,payload').eq('merchant_id',ctx.merchantId).eq('id',run.domain_event_id).maybeSingle(),
  ]);
  if (stepsResult.error) throw new Error(`Unable to load execution steps: ${stepsResult.error.message}`);
  const data: FlowRunTraceData = {
    run: { ...run, error: redactSensitiveData(run.error) },
    flow: flowResult.data,
    event: eventResult.data ? { ...eventResult.data, payload: redactSensitiveData(eventResult.data.payload) } : null,
    steps: (stepsResult.data ?? []).map((step: FlowRunTraceData['steps'][number]) => ({
      ...step,
      result: redactSensitiveData(step.result),
      error: redactSensitiveData(step.error),
    })),
  };
  return <>
    <SetBreadcrumbLabel label={`RUN-${hashId(run.id).slice(1)}`} />
    <h1 data-reference-ignore="accessibility-heading" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Run RUN-{hashId(run.id).slice(1)}</h1>
    <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}><span style={{ font: "400 17px/1 'IBM Plex Mono',monospace", color: '#1c1f23' }}>RUN-{hashId(run.id).slice(1)}</span><span style={{ padding: '2px 7px', borderRadius: 5, background: run.error || run.status === 'failed' ? '#fdf0e6' : run.completed_at ? '#eef6f1' : '#fff3e9', color: run.error || run.status === 'failed' ? '#b0431a' : run.completed_at ? '#1a6b43' : '#7a5310', font: "500 10px/1.5 'Inter',sans-serif" }}>{run.error || run.status === 'failed' ? 'FAILED' : run.completed_at ? 'COMPLETED' : 'RUNNING'}</span><div style={{ flex: 1 }}/>{flowResult.data ? <a href={`/controls/flows/${flowResult.data.id}?version=${flowResult.data.version}`} style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Open flow</a> : null}</div>
    <div data-screen-label="Flow run" data-visual-world="supplied-package" data-surface-id="flow-run-detail" data-archetype="P7/P8" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 22px 20px' }}><FlowRunTrace data={data} /></div>
  </>;
}
