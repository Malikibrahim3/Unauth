import Link from 'next/link';
import { scoreToGrade } from '@/lib/engine/weights';
import PageSizeSelect from '@/components/common/PageSizeSelect';
import AuditCustomersTableClient from '@/components/audit/AuditCustomersTableClient';
import type { AuditRunPageViewProps } from '@/app/(app)/audit/[runId]/auditRunPageViewTypes';

type AuditRunCustomersPanelProps = Pick<
  AuditRunPageViewProps,
  | 'runData'
  | 'jobId'
  | 'allCustomers'
  | 'customerPage'
  | 'txPage'
  | 'customerPageSize'
  | 'txPageSize'
  | 'customerOffset'
  | 'totalCustomers'
  | 'customerPages'
  | 'pagedCustomers'
  | 'selectedCustomerEmail'
  | 'defaultTab'
>;

export function AuditRunCustomersPanel({
  runData,
  jobId,
  allCustomers,
  customerPage,
  txPage,
  customerPageSize,
  txPageSize,
  customerOffset,
  totalCustomers,
  customerPages,
  pagedCustomers,
  selectedCustomerEmail,
  defaultTab,
}: AuditRunCustomersPanelProps) {
  return (
    <div className="space-y-4">
      {allCustomers.length > 0 ? (
        <div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)' }}>
            <span>
              Showing {totalCustomers === 0 ? 0 : customerOffset + 1}–{Math.min(customerOffset + customerPageSize, totalCustomers)} of {totalCustomers.toLocaleString()} customers
            </span>
            <PageSizeSelect pathname={`/audit/${jobId}`} pageSize={customerPageSize} pageParam="customerPage" pageSizeParam="customerPageSize" label="Customers per page" />
          </div>
          <AuditCustomersTableClient
            runId={runData.id}
            rows={pagedCustomers.map(([email, stats]) => ({
              email,
              orderCount: stats.orderCount,
              totalSpend: stats.totalSpend,
              maxScore: stats.maxScore,
              grade: scoreToGrade(stats.maxScore),
            }))}
            initialEmail={defaultTab === 'customers' ? selectedCustomerEmail : null}
          />
          {customerPages > 1 ? (
            <div className="px-4 py-2.5 flex items-center justify-end gap-2 text-xs border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>
              <span>Page {customerPage} of {customerPages}</span>
              {customerPage > 1 ? (
                <Link href={`/audit/${jobId}?customerPage=${customerPage - 1}&txPage=${txPage}&customerPageSize=${customerPageSize}&txPageSize=${txPageSize}`} className="px-2 py-1 border rounded" style={{ borderColor: 'var(--border)' }}>&larr; Prev</Link>
              ) : null}
              {customerPage < customerPages ? (
                <Link href={`/audit/${jobId}?customerPage=${customerPage + 1}&txPage=${txPage}&customerPageSize=${customerPageSize}&txPageSize=${txPageSize}`} className="px-2 py-1 border rounded" style={{ borderColor: 'var(--border)' }}>Next &rarr;</Link>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
