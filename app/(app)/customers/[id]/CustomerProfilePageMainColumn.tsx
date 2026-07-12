import { Activity, ShieldCheck } from 'lucide-react';
import CustomerNotes from '@/components/audit/CustomerNotes';
import CustomerSupportCasesSection from '@/components/customers/CustomerSupportCasesSection';
import BehaviorRoadmap from '@/components/customers/BehaviorRoadmap';
import { PanelCard } from '@/components/ui';
import { SectionCard } from '@/components/ui/SectionCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrencyNullable, formatDate, formatDateMode } from '@/lib/utils/format';
import { labelize, type RoadmapTransaction } from '@/app/(app)/customers/[id]/customerProfilePageLabels';
import type {
  ActivityLogEntry,
  CustomerProfileDisplay,
  LinkedAccountRow,
  MerchantSignalPill,
} from '@/app/(app)/customers/[id]/customerProfilePageLoad';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import type { ConfidenceGradeValue } from '@/lib/confidence';
import type { BehaviorRoadmapEvent } from '@/components/customers/BehaviorRoadmap';

export type CustomerProfilePageMainColumnProps = {
  profile: CustomerProfileDisplay;
  profileGrade: ConfidenceGradeValue;
  hasCleanRecord: boolean;
  merchantOrderCount: number;
  merchantNarrative: string;
  identitySignals: string[];
  transactions: RoadmapTransaction[];
  roadmapEvents: BehaviorRoadmapEvent[];
  identityTimeline: CustomerIntelligencePanel['identityTimeline'];
  variantCount: number;
  merchantSignalPills: MerchantSignalPill[];
  linkedAccounts: LinkedAccountRow[];
  activityLog: ActivityLogEntry[];
};

function compactTransactionTitle(tx: RoadmapTransaction): string {
  if (tx.chargeback_filed) return 'Chargeback filed';
  if (tx.refund_claimed) return 'Payout case recorded';
  return 'Order placed';
}

function CompactTransactionList({ transactions }: { transactions: RoadmapTransaction[] }) {
  if (transactions.length === 0) {
    return <EmptyState title="No orders in dataset" description="No merchant-owned order history is available for this customer yet." />;
  }

  return (
    <ol className="space-y-2">
      {transactions.slice(0, 25).map((tx) => (
        <PanelCard
          as="li"
          key={tx.order_id}
          variant="appInset"
          className="px-4 py-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                {compactTransactionTitle(tx)}
              </p>
              <p className="mt-0.5 font-mono text-caption" style={{ color: 'var(--text-secondary)' }}>
                {tx.order_id}
              </p>
            </div>
            <div className="text-right">
              <p className="num text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                {formatCurrencyNullable(Number(tx.order_value) || null)}
              </p>
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                {formatDateMode(tx.processed_at, 'table')}
              </p>
            </div>
          </div>
          {(tx.refund_claimed || tx.chargeback_filed) && (
            <p className="mt-2 text-caption" style={{ color: 'var(--text-secondary)' }}>
              {tx.refund_reason || tx.chargeback_reason_code || 'Reason not provided'}
            </p>
          )}
        </PanelCard>
      ))}
    </ol>
  );
}

export function CustomerProfilePageMainColumn({
  profile,
  profileGrade,
  hasCleanRecord,
  merchantOrderCount,
  merchantNarrative,
  identitySignals,
  transactions,
  roadmapEvents,
  identityTimeline,
  variantCount,
  merchantSignalPills,
  linkedAccounts,
  activityLog,
}: CustomerProfilePageMainColumnProps) {
  const payoutRoadmapEvents = roadmapEvents.filter(
    (event) => !['identity_change', 'watchlist_add', 'cross_merchant_signal'].includes(event.type),
  );

  void profile;
  void profileGrade;
  void merchantOrderCount;
  void identitySignals;
  void identityTimeline;
  void variantCount;
  void merchantSignalPills;
  void linkedAccounts;

  return (
    <div className="min-w-0 space-y-[var(--space-5)]">
      {!hasCleanRecord && (
        <SectionCard title="Order & payout history" description="Chronological order, refund, reship, chargeback, and payout-case events from merchant-owned data.">
          <PanelCard variant="appInset" className="mb-[var(--space-5)] p-[var(--space-4)]">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
              <p className="text-body-sm leading-relaxed" style={{ color: 'var(--text)' }}>{merchantNarrative}</p>
            </div>
          </PanelCard>

          {payoutRoadmapEvents.length > 0 ? (
            <BehaviorRoadmap events={payoutRoadmapEvents} />
          ) : (
            <CompactTransactionList transactions={transactions} />
          )}
        </SectionCard>
      )}

      {hasCleanRecord && (
        <SectionCard title="Order & payout history" description="Merchant-owned history for this customer.">
          <EmptyState title="No payout cases yet" description="Orders and payout cases will appear here as connected sources sync." />
        </SectionCard>
      )}

      <CustomerSupportCasesSection profileId={profile.id} />

      <SectionCard title="Merchant notes">
        <CustomerNotes customerProfileId={profile.id} />
      </SectionCard>

      <SectionCard title="Activity">
        {activityLog.length === 0 ? (
          <EmptyState title="No activity yet" description="Actions and changes will appear here." />
        ) : (
          <ol className="space-y-3">
            {activityLog.map((entry) => {
              const d = entry.event_data;
              let description = '';
              switch (entry.event_type) {
                case 'profile_created': description = 'Customer context created from imported history'; break;
                case 'status_changed': description = `Review status changed to ${d.to}`; break;
                case 'note_added': description = `Note added: ${d.note_preview ?? ''}`; break;
                case 'note_deleted': description = 'Note removed'; break;
                case 'watchlist_added': description = 'Legacy saved-case marker added'; break;
                case 'watchlist_removed': description = 'Legacy saved-case marker removed'; break;
                case 'evidence_generated': description = `Evidence package generated (${d.reference_number})`; break;
                case 'audit_appearance': description = `Appeared in ${d.audit_label ?? 'an imported history run'} with ${d.score ?? ''} confidence`; break;
                case 'manually_reviewed': description = 'Marked as manually reviewed'; break;
                default: description = labelize(entry.event_type);
              }
              return (
                <PanelCard key={entry.id} as="li" variant="appInset" className="flex items-start gap-3 p-3">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm" style={{ color: 'var(--text)' }}>{description}</p>
                    <p className="text-caption" style={{ color: 'var(--text-tertiary)' }} title={formatDate(entry.created_at)}>{formatDateMode(entry.created_at, 'recent')}</p>
                  </div>
                </PanelCard>
              );
            })}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}
