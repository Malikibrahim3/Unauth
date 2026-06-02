import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { gradeToLetter, type ConfidenceGrade } from '@/lib/engine/weights';
import { signalLabel } from '@/lib/copy/signalLabels';
import type { ConfidenceGradeValue } from '@/lib/confidence';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import DismissTransactionButton from '@/components/audit/DismissTransactionButton';
import FeedbackButtons from '@/components/audit/FeedbackButtons';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import type { AuditRunPageViewProps, TxRow } from '@/app/(app)/audit/[runId]/auditRunPageViewTypes';

type AuditRunTransactionsPanelProps = Pick<
  AuditRunPageViewProps,
  | 'runData'
  | 'jobId'
  | 'customerPage'
  | 'txPage'
  | 'customerPageSize'
  | 'txPageSize'
  | 'totalTransactions'
  | 'txPages'
  | 'transactions'
  | 'crossMerchantTxIds'
>;

export function AuditRunTransactionsPanel({
  runData,
  jobId,
  customerPage,
  txPage,
  customerPageSize,
  txPageSize,
  totalTransactions,
  txPages,
  transactions,
  crossMerchantTxIds,
}: AuditRunTransactionsPanelProps) {
  return (
    <div className="space-y-4">
      {txPage > 1 && (transactions ?? []).length === 0 ? (
        <div className="rounded-xl px-6 py-8 text-center border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-body-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>No more transactions on this page.</p>
          <Link href={`/audit/${jobId}`} className="text-caption hover:underline" style={{ color: 'var(--text-muted)' }}>← Back to page 1</Link>
        </div>
      ) : null}

      {totalTransactions > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
              All transactions
              <span className="ml-1 font-normal" style={{ color: 'var(--text-muted)' }}>({totalTransactions.toLocaleString()} total)</span>
            </h2>
            {txPages > 1 ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Page {txPage} of {txPages}</span>
                {txPage > 1 ? (
                  <Link href={`/audit/${jobId}?txPage=${txPage - 1}&customerPage=${customerPage}&customerPageSize=${customerPageSize}&txPageSize=${txPageSize}`} className="px-2 py-1 border rounded" style={{ borderColor: 'var(--border)' }}>&larr; Prev</Link>
                ) : null}
                {txPage < txPages ? (
                  <Link href={`/audit/${jobId}?txPage=${txPage + 1}&customerPage=${customerPage}&customerPageSize=${customerPageSize}&txPageSize=${txPageSize}`} className="px-2 py-1 border rounded" style={{ borderColor: 'var(--border)' }}>Next &rarr;</Link>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="mb-3 flex items-center justify-end">
            <PageSizeSelect pathname={`/audit/${jobId}`} pageSize={txPageSize} pageParam="txPage" pageSizeParam="txPageSize" label="Transactions per page" />
          </div>
          <div className="rounded-lg overflow-hidden border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                  <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Order ID</th>
                  <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Date ↓</th>
                  <th className="text-right px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Total</th>
                  <th className="text-right px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Score ↓</th>
                  <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Grade</th>
                  <th className="text-left px-4 py-2.5 text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>Top signal</th>
                  <th className="px-4 py-2.5" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {((transactions ?? []) as unknown as TxRow[]).map((tx) => {
                  const flags = ((tx as any).signals_matched as string[]) ?? ((tx as any).identity_signals as string[]) ?? ((tx as any).fraud_flags as string[]) ?? [];
                  const topFlag = flags[0];
                  const idGrade = (tx as any).identity_confidence_grade as 'definite' | 'probable' | 'possible' | 'weak' | null | undefined;
                  const letterGrade: ConfidenceGradeValue | null = idGrade
                    ? gradeToLetter(idGrade as ConfidenceGrade)
                    : null;
                  return (
                    <tr key={tx.id} className="border-b transition-colors hover-bg-subtle" style={{ borderColor: 'var(--border-subtle)' }}>
                      <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{tx.order_id}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(tx.processed_at)}</td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--text)' }}>{formatCurrency(tx.order_value ?? 0)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: 'var(--text)' }}>{Math.round((tx as any).identity_score ?? (tx as any).match_score ?? 0)}</td>
                      <td className="px-4 py-2.5">
                        {letterGrade
                          ? <ConfidenceBadge grade={letterGrade} size="sm" />
                          : <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>Ungraded</span>}
                      </td>
                      <td className="px-4 py-2.5 text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
                        <div className="truncate">{topFlag ? signalLabel(topFlag).short : '-'}</div>
                        {crossMerchantTxIds.has(tx.id) ? (
                          <div className="mt-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                            Also seen at other merchants
                          </div>
                        ) : null}
                        <FeedbackButtons transactionId={tx.id} signalsThatFired={flags} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/audit/${jobId}/transaction/${tx.id}`} className="inline-flex items-center gap-0.5 text-xs font-semibold hover:underline" style={{ color: 'var(--text)' }}>
                            Details <ArrowRight className="h-3 w-3" />
                          </Link>
                          <DismissTransactionButton txId={tx.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {totalTransactions === 0 ? (
        <div className="rounded-xl px-6 py-8 text-center border space-y-3" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>No transactions found for this audit.</p>
          <p className="text-caption" style={{ color: 'var(--text-muted)' }}>This audit may still be processing, or the file had no recognised order rows.</p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <Link href="/upload" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors" style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}>
              Run a new audit
            </Link>
            <Link href="/history" className="text-sm font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>View audit history</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
