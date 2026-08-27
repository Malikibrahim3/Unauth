import { notFound, redirect } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from '@/lib/auth/requestContext';
import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import { loadProviderConnectionReadModel } from '@/lib/connections/loadProviderConnectionReadModel';
import { TABLES } from '@/lib/supabase/tables';
import { PageFrame } from '@/components/ui/PageFrame';
import {
  SourceDetailOperations,
  type OperationsIngestionIssue,
  type OperationsSyncJob,
} from '@/components/sources/SourceDetailOperations';
import { SourceConnectionActionsOperations } from '@/components/sources/SourceConnectionActionsOperations';

export const dynamic = 'force-dynamic';

const PROCESSING_JOB_SOURCES = new Set([
  'shopify',
  'woocommerce',
  'bigcommerce',
  'gorgias',
  'zendesk',
  'freshdesk',
  'shipbob',
]);

function processingJobSource(providerId: string): string | null {
  if (providerId === 'csv_import') return 'csv';
  return PROCESSING_JOB_SOURCES.has(providerId) ? providerId : null;
}

export default async function ConnectionPage({
  params,
}: {
  params: Promise<{ provider: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect('/overview');
  const { provider } = await params;
  const item = (await loadConnectorCatalogue(service, ctx.merchantId)).find((candidate) => candidate.id === provider);
  if (!item) notFound();

  const { readModel, badge, displayNote } = await loadProviderConnectionReadModel({
    service,
    merchantId: ctx.merchantId,
    item,
  });
  const jobSource = processingJobSource(item.id);
  const [canManage, jobsResult, issuesResult] = await Promise.all([
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
    jobSource
      ? service
        .from(TABLES.PROCESSING_JOBS)
        .select('id,status,job_kind,processed_rows,failed_rows,created_at,completed_at,last_error_code')
        .eq('merchant_id', ctx.merchantId)
        .eq('source', jobSource)
        .order('created_at', { ascending: false })
        .limit(20)
      : Promise.resolve({ data: [], error: null }),
    item.connectionId
      ? service
        .from(TABLES.INGESTION_EVENTS)
        .select('id,event_type,status,last_error,received_at')
        .eq('merchant_id', ctx.merchantId)
        .eq('connection_id', item.connectionId)
        .in('status', ['failed', 'dead_letter'])
        .order('received_at', { ascending: false })
        .limit(10)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (jobsResult.error) throw new Error(`source_run_history_failed: ${jobsResult.error.message}`);
  if (issuesResult.error) throw new Error(`source_ingestion_issues_failed: ${issuesResult.error.message}`);

  const jobs = (jobsResult.data ?? []) as OperationsSyncJob[];
  const issues = (issuesResult.data ?? []) as OperationsIngestionIssue[];
  const sourceHref = `/sources/${item.id}`;
  const setupHref = `/sources/setup/${item.id}?returnTo=${encodeURIComponent(sourceHref)}`;

  return (
    <PageFrame
      surfaceId="source-detail"
      archetype="operations-source-detail"
      title={item.name}
      subtitle="One connection: what it is allowed to read, how current each object family is, which rows failed to ingest, and what repairing or disconnecting would actually do."
      breadcrumbs={[
        { label: 'Sources', href: '/sources' },
        { label: 'Connected', href: '/sources/connected' },
        { label: item.name },
      ]}
      actions={
        <SourceConnectionActionsOperations
          providerId={item.id}
          providerName={item.name}
          setupHref={setupHref}
          canManage={canManage}
          connected={readModel.configuration === 'configured'}
          planned={item.stage === 'planned'}
        />
      }
    >
      <SourceDetailOperations
        item={item}
        readModel={readModel}
        badge={badge}
        displayNote={displayNote}
        jobs={jobs}
        issues={issues}
        canManage={canManage}
        setupHref={setupHref}
      />
    </PageFrame>
  );
}
