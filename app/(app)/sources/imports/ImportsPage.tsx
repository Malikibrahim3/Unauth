import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/auth/requestContext';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { ImportsVisualClient, type ImportHistoryItem } from '@/components/imports/ImportsVisualClient';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';
import { buildHoldRateTimeseries } from '@/lib/capabilities/derived';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Imports' };

export default async function ImportsPage({ searchParams }: { searchParams?: Promise<{ step?: string }> }) {
  const resolvedSearch = await (searchParams ?? Promise.resolve<{ step?: string }>({}));
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.MANAGE_SETTINGS);
  if (denied || !ctx) redirect('/sources/connected');
  await throwForAcceptanceScenario('imports-error');
  const { data, error } = await service
    .from(TABLES.PROCESSING_JOBS)
    .select('id,label,status,total_rows,processed_rows,failed_rows,created_at,completed_at,cursor,error_log')
    .eq('merchant_id', ctx.merchantId)
    .eq('job_kind', 'csv_import')
    .order('created_at', { ascending: false })
    .limit(31);
  if (error) throw new Error(`import_history_failed: ${error.message}`);
  const history = (data ?? []) as ImportHistoryItem[];
  return <section data-screen-label="Imports" data-visual-world="supplied-package" data-surface-id="csv-imports" data-archetype="P8-import-workbench" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}><h1 style={{ position: 'absolute', width: 1, height: 1, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Imports</h1><ImportsVisualClient history={history} initialStep={resolvedSearch.step} holdRateTimeseries={buildHoldRateTimeseries(history)} /></section>;
}
