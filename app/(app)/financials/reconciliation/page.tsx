import Link from 'next/link';
import { ArrowRight, CircleAlert, GitCompareArrows, ShieldCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import { PageFrame, OperationalState, Surface } from '@/components/ui';
import { ExceptionQueue } from '@/components/exceptions/ExceptionQueue';
import { countOpenExceptions } from '@/lib/exceptions/store';
import { getRequestServiceClient, getRequestUser, requirePagePermission } from '@/lib/auth/requestContext';
import { PERMISSIONS } from '@/lib/permissions';
import { getCachedConnectionState } from '@/lib/connections/getConnectionState';
import { formatNumber } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function ReconciliationPage() {
  const user = await getRequestUser();
  if (!user) redirect('/login');
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect('/overview');

  const [openExceptions, connectionState] = await Promise.all([
    countOpenExceptions(service, ctx.merchantId).catch(() => null),
    getCachedConnectionState(ctx.merchantId),
  ]);
  const sourceConnected = connectionState.orderSourceConnected || connectionState.helpdesk;

  return (
    <PageFrame
      title="Reconciliation"
      eyebrow="Financials"
      subtitle="Compare source records with the confirmed ledger. Exceptions stay visible until they are resolved or dismissed with an audit receipt."
      actions={
        <Link href="/sources/connected" className="inline-flex h-10 items-center gap-2 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 text-body font-medium text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)]">
          Source health <ArrowRight size={14} aria-hidden="true" />
        </Link>
      }
    >
      <div className="space-y-5">
        <Surface structure="working" className="overflow-hidden">
          <div className="grid divide-y divide-[var(--ua-border-hairline)] md:grid-cols-4 md:divide-x md:divide-y-0">
            <div className="p-4 sm:p-5">
              <p className="text-label text-[var(--ua-text-tertiary)]">Ledger scope</p>
              <p className="mt-2 text-body font-medium text-[var(--ua-text-primary)]">Confirmed entries only</p>
              <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">Estimated and modelled values are excluded from this comparison.</p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-label text-[var(--ua-text-tertiary)]">Open exceptions</p>
              <p className="mt-2 text-money text-[var(--ua-text-primary)]">{openExceptions === null ? '—' : formatNumber(openExceptions)}</p>
              <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">Each row needs an explicit resolution path.</p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-label text-[var(--ua-text-tertiary)]">Source coverage</p>
              <p className="mt-2 text-body font-medium text-[var(--ua-text-primary)]">{sourceConnected ? 'Connected source available' : 'Coverage needs attention'}</p>
              <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">Coverage does not imply complete historical scope.</p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-label text-[var(--ua-text-tertiary)]">Decision boundary</p>
              <p className="mt-2 text-body font-medium text-[var(--ua-text-primary)]">Review, don’t infer</p>
              <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">No unresolved difference is treated as zero.</p>
            </div>
          </div>
        </Surface>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Surface structure="working" className="overflow-hidden">
            <div className="flex items-start gap-3 border-b border-[var(--ua-border-subtle)] px-5 py-4">
              <GitCompareArrows size={18} className="mt-0.5 text-[var(--ua-action-700)]" aria-hidden="true" />
              <div>
                <h2 className="text-h3 text-[var(--ua-text-primary)]">Exception queue</h2>
                <p className="mt-1 text-caption text-[var(--ua-text-secondary)]">Resolve source mismatches and evidence gaps from the same work surface.</p>
              </div>
            </div>
            <div className="p-5">
              <ExceptionQueue />
            </div>
          </Surface>

          <div className="space-y-5">
            <Surface structure="inset" pad="standard">
              <div className="flex items-center gap-2 text-label text-[var(--ua-text-tertiary)]"><ShieldCheck size={15} aria-hidden="true" /> Trust boundary</div>
              <p className="mt-3 text-body font-medium text-[var(--ua-text-primary)]">Authority is explicit at every step.</p>
              <ul className="mt-3 space-y-2 text-caption text-[var(--ua-text-secondary)]">
                <li>Source facts remain attributable.</li>
                <li>Recommendations remain advisory.</li>
                <li>Only confirmed outcomes enter the ledger.</li>
              </ul>
            </Surface>
            <Surface structure="inset" pad="standard">
              <div className="flex items-center gap-2 text-label text-[var(--ua-warning)]"><CircleAlert size={15} aria-hidden="true" /> If data is incomplete</div>
              <p className="mt-3 text-caption leading-6 text-[var(--ua-text-secondary)]">Repair source coverage or open the source detail before making a merchant decision.</p>
              <Link href="/sources/connected" className="mt-4 inline-flex items-center gap-1 text-label font-medium text-[var(--ua-action-700)] hover:underline">Inspect sources <ArrowRight size={13} aria-hidden="true" /></Link>
            </Surface>
          </div>
        </div>

        {openExceptions === null ? (
          <OperationalState
            kind="partial"
            title="Exception count could not be verified"
            description="The queue remains available, but the summary count is unavailable. No financial value was inferred."
          />
        ) : null}
      </div>
    </PageFrame>
  );
}
