import { screenshotSourceJobs } from '@/lib/demo/screenshotAccount';
import { notFound, redirect } from 'next/navigation';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { loadConnectorCatalogue } from '@/lib/connectors/catalogue';
import { loadProviderConnectionReadModel } from '@/lib/connections/loadProviderConnectionReadModel';
import { connectionReadModel } from '@/lib/connections/readModel';
import { categoryLabel, type CatalogueRowItem } from '@/lib/integrations/catalogueView';
import { TABLES } from '@/lib/supabase/tables';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { SourcesOperations } from '@/components/sources/SourcesOperations';
import { SourceDetailOperations, type OperationsIngestionIssue, type OperationsSyncJob } from '@/components/sources/SourceDetailOperations';
import { SourceConnectionActionsOperations, SourceRepairOverlay } from '@/components/sources/SourceConnectionActionsOperations';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

const PROCESSING_JOB_SOURCES = new Set(['shopify', 'woocommerce', 'bigcommerce', 'gorgias', 'zendesk', 'freshdesk', 'shipbob']);

function processingJobSource(providerId: string): string | null {
  if (providerId === 'csv_import') return 'csv';
  return PROCESSING_JOB_SOURCES.has(providerId) ? providerId : null;
}

function detailStatus(readModel: Awaited<ReturnType<typeof loadProviderConnectionReadModel>>['readModel'], badge: Awaited<ReturnType<typeof loadProviderConnectionReadModel>>['badge']) {
  if (readModel.configuration !== 'configured') return { label: 'NOT CONNECTED', background: '#f4f3f1', color: '#40454a' };
  if (readModel.operational === 'healthy') return { label: 'HEALTHY', background: '#eef6f1', color: '#1a6b43' };
  if (readModel.operational === 'attention') return { label: String(badge).replaceAll('_', ' ').toUpperCase(), background: '#fdf0e6', color: '#b0431a' };
  return { label: 'NOT VERIFIED', background: '#fff3e9', color: '#7a5310' };
}

export default async function ConnectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect('/overview');
  await throwForAcceptanceScenario('source-error');
  const [{ provider }, query] = await Promise.all([params, searchParams]);
  const catalogueRows = await loadConnectorCatalogue(service, ctx.merchantId);
  const item = catalogueRows.find((candidate) => candidate.id === provider);
  if (!item) notFound();

  const { readModel, badge, displayNote } = await loadProviderConnectionReadModel({ service, merchantId: ctx.merchantId, item });
  const jobSource = processingJobSource(item.id);
  const [canManage, jobsResult, issuesResult] = await Promise.all([
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
    jobSource
      ? service.from(TABLES.PROCESSING_JOBS).select('id,status,job_kind,processed_rows,failed_rows,created_at,completed_at,last_error_code').eq('merchant_id', ctx.merchantId).eq('source', jobSource).order('created_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [], error: null }),
    item.connectionId
      ? service.from(TABLES.INGESTION_EVENTS).select('id,event_type,status,last_error,received_at').eq('merchant_id', ctx.merchantId).eq('connection_id', item.connectionId).in('status', ['failed', 'dead_letter']).order('received_at', { ascending: false }).limit(10)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (jobsResult.error) throw new Error(`source_run_history_failed: ${jobsResult.error.message}`);
  if (issuesResult.error) throw new Error(`source_ingestion_issues_failed: ${issuesResult.error.message}`);

  const jobs = item.screenshotFixture && item.lastDataReceivedAt ? screenshotSourceJobs(item.id, item.lastDataReceivedAt) : (jobsResult.data ?? []) as OperationsSyncJob[];
  const issues = item.screenshotFixture ? [] : (issuesResult.data ?? []) as OperationsIngestionIssue[];
  const sourceHref = `/sources/${item.id}`;
  const setupHref = `/sources/setup/${item.id}?returnTo=${encodeURIComponent(sourceHref)}`;
  const repair = query?.tab === 'repair';
  const catalogue: CatalogueRowItem[] = catalogueRows.map((candidate) => {
    const model = connectionReadModel({
      providerId: candidate.id,
      syncState: candidate.syncState,
      freshness: candidate.freshness,
      liveVerification: candidate.liveVerification,
      lastVerifiedAt: candidate.lastVerifiedAt,
      importedRecords: candidate.importedRecords,
    });
    return { ...candidate, status: model.bucket, badge: model.badge, lastError: model.note, noteTone: model.noteTone, readModel: model };
  });
  const state = detailStatus(readModel, badge);
  const direction = [...new Set(item.capabilities.filter((capability) => capability.availability === 'enabled').map((capability) => capability.level))].join(' · ') || 'operations unavailable';
  const delivery = readModel.deliveryModel === 'periodic_sync' ? 'scheduled sync' : readModel.deliveryModel === 'webhook' ? 'webhooks' : 'on demand';

  if (repair) {
    return (
      <section data-screen-label="Repair source" data-visual-world="supplied-package" data-surface-id="source-detail" data-overlay-id="connection-and-disconnection-modals" style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, position: 'relative', display: 'flex', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
        <SetBreadcrumbLabel label="Evidence coverage" detail={`${item.name} needs repair${item.lastError ? ` · ${item.lastError}` : ''}`} />
        <SourcesOperations items={catalogue} view="connected" />
        <SourceRepairOverlay providerName={item.name} sourceHref={sourceHref} setupHref={setupHref} category={item.category} account={item.account} lastError={item.lastError ?? displayNote} lastSyncAttemptAt={item.lastSyncAttemptAt} scopes={item.scopes} />
      </section>
    );
  }

  return (
    <section data-screen-label="Source detail" data-visual-world="supplied-package" data-surface-id="source-detail" data-archetype="P7" style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', color: '#1c1f23' }}>
      <SetBreadcrumbLabel label={item.name} detail={`${categoryLabel(item.category).toLowerCase()} layer · ${direction} · ${delivery}`} />
      <div style={{ height: 54, flex: 'none', padding: '0 22px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #eae8e5' }}>
        <span style={{ padding: '2px 7px', borderRadius: 5, background: state.background, color: state.color, font: "500 10px/1.5 'Inter',sans-serif" }}>{state.label}</span>
        <span style={{ color: '#1c1f23', font: "500 14.5px/1.2 'Inter',sans-serif" }}>{item.name}</span>
        <span style={{ color: '#64686d', font: "400 12px/1.4 'Inter',sans-serif" }}>{item.account ?? 'Account identifier unavailable'} · {readModel.configuration === 'configured' ? 'connected' : 'not connected'}</span>
        <div style={{ flex: 1 }} />
        <SourceConnectionActionsOperations providerId={item.id} providerName={item.name} sourceHref={sourceHref} setupHref={setupHref} canManage={canManage} connected={readModel.configuration === 'configured'} planned={item.stage === 'planned'} category={item.category} account={item.account} lastError={item.lastError ?? displayNote} lastSyncAttemptAt={item.lastSyncAttemptAt} scopes={item.scopes} />
      </div>
      <SourceDetailOperations item={item} readModel={readModel} badge={badge} displayNote={displayNote} jobs={jobs} issues={issues} />
    </section>
  );
}
