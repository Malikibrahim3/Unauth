import { createClient, createServiceClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { formatDate, formatCurrencyNullable } from '@/lib/utils/format';
import { labelFor } from '@/lib/copy/labels';
import { signalCopy } from '@/lib/copy/signals';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import type { ConfidenceGradeValue } from '@/lib/confidence';
import { gradeToLetter, type ConfidenceGrade } from '@/lib/engine/weights';
import type { Database } from '@/lib/supabase/types';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { fetchMerchantScopedTransaction } from '@/lib/supabase/merchantHelpers';

type AuditTxRow = Database['public']['Tables']['audit_transactions']['Row'];

interface Props {
  params: Promise<{ runId: string; id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function TransactionDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createServiceClient();
  // Verify caller has view permission and get their merchantId
  const { denied, ctx } = await requirePermission(svc, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) {
    return (
      <div className="p-8">
        <h1 className="text-heading-lg">Access denied</h1>
        <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
          You do not have permission to view audit transactions.
        </p>
      </div>
    );
  }

  // Verify runId belongs to this merchant AND fetch transaction scoped by both
  // id AND job_id - prevents cross-merchant transaction lookup by UUID.
  const tx = await fetchMerchantScopedTransaction(svc, ctx.merchantId, resolvedParams.id, resolvedParams.runId);

  if (!tx) notFound();

  const txData = tx as unknown as AuditTxRow & {
    signals_matched?: string[] | null;
    behavioural_flags?: string[] | null;
    identity_confidence_grade?: string | null;
    identity_score?: number | null;
    cluster_id?: string | null;
  };
  const signals = Array.isArray(txData.signals_matched) ? txData.signals_matched : [];
  const flags = Array.isArray(txData.behavioural_flags) ? txData.behavioural_flags : [];

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>
          <Link href="/dashboard" className="hover:opacity-80 transition-colors">Dashboard</Link>
          <span>/</span>
          <Link href={`/audit/${resolvedParams.runId}`} className="hover:opacity-80 transition-colors">Audit</Link>
          <span>/</span>
          <span>Transaction</span>
        </div>
        <h1 className="text-heading-lg">Order {txData.order_id}</h1>
        <div className="mt-2">
          <Link
            href={`/audit/${resolvedParams.runId}`}
            className="inline-flex items-center gap-1.5 text-caption transition-colors hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to audit results
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md px-5 py-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
          <div className="text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>Identity confidence</div>
          {(() => {
            const idGrade = txData.identity_confidence_grade as 'definite' | 'probable' | 'possible' | 'weak' | null | undefined;
            const letter: ConfidenceGradeValue | null = idGrade
              ? gradeToLetter(idGrade as ConfidenceGrade)
              : null;
            return <div>{letter ? <ConfidenceBadge grade={letter} /> : <span className="text-caption" style={{ color: 'var(--text-tertiary)' }}>Ungraded</span>}</div>;
          })()}
        </div>
        <div className="rounded-md px-5 py-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
          <div className="text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>Order total</div>
          <div className="text-display-md" style={{ color: 'var(--text)' }}>
            {formatCurrencyNullable(txData.order_value, (txData as any).currency)}
          </div>
        </div>
        <div className="rounded-md px-5 py-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
          <div className="text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>Processed</div>
          <div className="text-body-md font-medium" style={{ color: 'var(--text)' }}>
            {txData.processed_at ? formatDate(txData.processed_at) : '—'}
          </div>
        </div>
      </div>

      <div className="rounded-md p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
        <h2 className="text-heading-sm mb-3">Order details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body-sm">
          {[
            { label: 'Order ID', value: txData.order_id },
            { label: 'Customer', value: txData.customer_email ?? '-' },
            { label: 'Identity confidence grade', value: txData.identity_confidence_grade ?? '-' },
            { label: 'Refund reason', value: txData.refund_reason ?? '-' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-muted)' }}>
              <dt style={{ color: 'var(--text-secondary)' }}>{label}</dt>
              <dd className="font-mono text-caption text-right" style={{ color: 'var(--text)' }}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-md p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
        <h2 className="text-heading-sm mb-3">Identity match signals ({signals.length})</h2>
        {signals.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>No review reasons were stored for this order.</p>
        ) : (
          <div className="space-y-3">
            {signals.map((sig) => (
              <div key={sig} className="rounded-md p-4 border" style={{ borderColor: 'var(--border-muted)' }}>
                <span className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>{signalCopy(sig).title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
        <h2 className="text-heading-sm mb-3">Behavioural indicators ({flags.length})</h2>
        {flags.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-secondary)' }}>No behavioural flags were stored for this order.</p>
        ) : (
          <div className="space-y-2">
            {flags.map((flag) => (
              <div key={flag} className="rounded-md px-3 py-2 border" style={{ borderColor: 'var(--border-muted)' }}>
                <span className="text-body-sm" style={{ color: 'var(--text)' }}>{labelFor(flag)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
