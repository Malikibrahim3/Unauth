import { notFound, redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { ButtonLink, PageFrame } from '@/components/ui';
import { FlowRunTrace, type FlowRunTraceData } from '@/components/rules/FlowRunTrace';
import { hashId } from '@/lib/ui/displayRef';
import { redactSensitiveData } from '@/lib/log/redactSensitiveData';

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
  return <PageFrame
    title={`Run RUN-${hashId(run.id).slice(1)}`}
    subtitle="Why this automation acted, paused or failed — step by step, with the trigger it received and the records it changed."
    breadcrumbs={[{label:'Flows',href:'/controls/flows'},{label:'Run history',href:'/controls/flows/runs'},{label:`RUN-${hashId(run.id).slice(1)}`}]}
    actions={flowResult.data ? <ButtonLink href={`/controls/flows/${flowResult.data.id}?version=${flowResult.data.version}`} variant="secondary" size="sm">Open flow</ButtonLink> : undefined}
    surfaceId="flow-run-detail"
    archetype="P7/P8"
  ><FlowRunTrace data={data} /></PageFrame>;
}
