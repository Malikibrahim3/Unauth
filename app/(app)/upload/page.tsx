import UploadClient from '@/components/upload/UploadClient';
import { redirect } from 'next/navigation';
import { ButtonLink, WorkbenchPage } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import type { Database } from '@/lib/supabase/types';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';

type RecentRunRow = Pick<
  Database['public']['Tables']['processing_jobs']['Row'],
  'id' | 'filename' | 'label' | 'status' | 'created_at' | 'total_rows' | 'flagged_count'
>;

interface UploadPageProps {
  searchParams: { welcome?: string };
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();

  let recentImports: Array<{
    id: string;
    filename: string | null;
    label: string | null;
    status: string;
    createdAt: string;
    totalRows: number;
    flaggedCount: number;
  }> = [];

  if (user) {
    const serviceClient = createServiceClient();
    const { denied: uploadDenied } = await requirePermission(serviceClient, user.id, PERMISSIONS.UPLOAD_CSV);
    if (uploadDenied) {
      redirect('/dashboard');
    }

    const { denied: histDenied, ctx: histCtx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_HISTORY);
    if (!histDenied) {
      const { data: recentRuns } = await serviceClient
        .from(TABLES.PROCESSING_JOBS)
        .select('id, filename, label, status, created_at, total_rows, flagged_count')
        .eq('merchant_id', histCtx.merchantId)
        .eq('hidden_by_merchant', false)
        .order('created_at', { ascending: false })
        .limit(5);

      recentImports = ((recentRuns ?? []) as RecentRunRow[]).map((run) => ({
        id: run.id,
        filename: run.filename,
        label: run.label,
        status: run.status,
        createdAt: run.created_at,
        totalRows: run.total_rows,
        flaggedCount: run.flagged_count ?? 0,
      }));
    }
  }

  const sp = (await Promise.resolve(searchParams)) ?? {};
  const isWelcome = sp.welcome === '1';
  return (
    <WorkbenchPage
      title="Historical import"
      subtitle="Backfill historical orders to detect identity matches and repeated claim patterns. CSV import is optional — your live Shopify and helpdesk sources stay your primary feed."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="audits"
      actions={<ButtonLink href="/history" variant="secondary" size="sm">Import history</ButtonLink>}
      main={
        <div className="mx-auto w-full max-w-3xl p-4">
          {isWelcome && (
            <div
              className="mb-6 rounded-[var(--radius-2)] px-5 py-4"
              style={{ background: 'var(--risk-low-bg)', border: '1px solid var(--risk-low-line)' }}
            >
              <p className="text-h3" style={{ color: 'var(--risk-low-fg)' }}>Welcome to Unauth - your account is set up.</p>
              <p className="text-caption mt-0.5" style={{ color: 'var(--risk-low-fg)' }}>
                Import a historical order export below to backfill identity matching, or connect Shopify and your helpdesk for live monitoring.
              </p>
            </div>
          )}
          <UploadClient recentImports={recentImports} />
          <p className="mt-6 text-center text-caption" style={{ color: 'var(--text-tertiary)' }}>
            CSV only · up to 200 MB · 500k rows per file · map columns, then import
          </p>
        </div>
      }
    />
  );
}
