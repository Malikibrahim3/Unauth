import { Suspense } from 'react';
import { formatDate } from '@/lib/utils/format';
import { DetailPageShell } from '@/components/workbench/DetailPageShell';
import DataQualityBanner from '@/components/audit/DataQualityBanner';
import AuditTabs from '@/components/audit/AuditTabs';
import { AuditRunCustomersPanel } from '@/app/(app)/audit/[runId]/AuditRunCustomersPanel';
import { AuditRunDataQualityPanel } from '@/app/(app)/audit/[runId]/AuditRunDataQualityPanel';
import { AuditRunOverviewPanel } from '@/app/(app)/audit/[runId]/AuditRunOverviewPanel';
import { AuditRunPageSummarySections } from '@/app/(app)/audit/[runId]/AuditRunPageSummarySections';
import { AuditRunTransactionsPanel } from '@/app/(app)/audit/[runId]/AuditRunTransactionsPanel';
import type { AuditRunPageViewProps, CustomerRollup } from '@/app/(app)/audit/[runId]/auditRunPageViewTypes';

export type { AuditRunPageViewProps, CustomerRollup };

export function AuditRunPageView(props: AuditRunPageViewProps) {
  const {
    runData,
    jobId,
    statusBadge,
    summary,
    gradeCounts,
    networkLinkedCount,
    dataQuality,
    defaultTab,
    hasFlags,
    isRunComplete,
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
    totalTransactions,
    txPages,
    transactions,
    crossMerchantTxIds,
    valueAtRisk,
    estimatedExposure,
  } = props;

  const isShopify = runData.upload_type === 'shopify';

  return (
    <DetailPageShell
      backHref={isShopify ? '/store' : '/dashboard'}
      backLabel={isShopify ? 'Store overview' : 'Dashboard'}
      eyebrow={isShopify ? 'Intelligence' : 'Audit result'}
      title={isShopify ? 'Store intelligence' : 'Audit results'}
      subtitle={
        isShopify
          ? `${runData.filename.replace(/^shopify-/, '')} · synced ${formatDate(runData.created_at)}`
          : `${runData.filename} · ${formatDate(runData.created_at)}`
      }
      statusBadge={statusBadge}
    >
      <Suspense fallback={<div className="p-6 text-body-sm" style={{ color: 'var(--text-tertiary)' }}>Loading…</div>}>
        <AuditTabs
          defaultTab={defaultTab}
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'customers', label: 'Customers' },
            { id: 'transactions', label: `Transactions (${totalTransactions.toLocaleString()})` },
            { id: 'data_quality', label: 'Data quality' },
          ]}
          panels={{
            overview: (
              <>
                <AuditRunPageSummarySections
                  runData={runData}
                  jobId={jobId}
                  summary={summary}
                  gradeCounts={gradeCounts}
                  networkLinkedCount={networkLinkedCount}
                  hasFlags={hasFlags}
                />
                {dataQuality ? (
                  <div className="px-4 pb-4">
                    <DataQualityBanner report={dataQuality} runId={runData.id} />
                  </div>
                ) : null}
                <div className="px-4 pb-4">
                  <AuditRunOverviewPanel
                    runData={runData}
                    jobId={jobId}
                    summary={summary}
                    gradeCounts={gradeCounts}
                    hasFlags={hasFlags}
                    isRunComplete={isRunComplete}
                    allCustomers={allCustomers}
                    customerPage={customerPage}
                    txPage={txPage}
                    customerPageSize={customerPageSize}
                    txPageSize={txPageSize}
                  />
                </div>
              </>
            ),
            customers: (
              <div className="px-4 pb-4">
                <AuditRunCustomersPanel
                  runData={runData}
                  jobId={jobId}
                  allCustomers={allCustomers}
                  customerPage={customerPage}
                  txPage={txPage}
                  customerPageSize={customerPageSize}
                  txPageSize={txPageSize}
                  customerOffset={customerOffset}
                  totalCustomers={totalCustomers}
                  customerPages={customerPages}
                  pagedCustomers={pagedCustomers}
                  selectedCustomerEmail={selectedCustomerEmail}
                  defaultTab={defaultTab}
                />
              </div>
            ),
            transactions: (
              <div className="px-4 pb-4">
                <AuditRunTransactionsPanel
                  runData={runData}
                  jobId={jobId}
                  customerPage={customerPage}
                  txPage={txPage}
                  customerPageSize={customerPageSize}
                  txPageSize={txPageSize}
                  totalTransactions={totalTransactions}
                  txPages={txPages}
                  transactions={transactions}
                  crossMerchantTxIds={crossMerchantTxIds}
                />
              </div>
            ),
            data_quality: (
              <div className="px-4 pb-4">
                <AuditRunDataQualityPanel
                  runData={runData}
                  jobId={jobId}
                  dataQuality={dataQuality}
                  summary={summary}
                  valueAtRisk={valueAtRisk}
                  estimatedExposure={estimatedExposure}
                />
              </div>
            ),
          }}
        />
      </Suspense>
    </DetailPageShell>
  );
}
