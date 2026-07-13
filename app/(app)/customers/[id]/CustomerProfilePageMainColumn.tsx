import { Activity } from "lucide-react";
import Link from "next/link";
import CustomerNotes from "@/components/audit/CustomerNotes";
import CustomerSupportCasesSection from "@/components/customers/CustomerSupportCasesSection";
import { PanelCard } from "@/components/ui";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatMoneyOrDash,
  formatDateTime,
  formatDateAbsolute,
  formatDateMode,
} from "@/lib/utils/format";
import {
  labelize,
  type RoadmapTransaction,
} from "@/app/(app)/customers/[id]/customerProfilePageLabels";
import type {
  ActivityLogEntry,
  CustomerProfileDisplay,
  LinkedAccountRow,
  MerchantSignalPill,
} from "@/app/(app)/customers/[id]/customerProfilePageLoad";
import type { CustomerIntelligencePanel } from "@/app/api/customers/[id]/route";
import type { ConfidenceGradeValue } from "@/lib/confidence";
import type { BehaviorRoadmapEvent } from "@/components/customers/BehaviorRoadmap";

export type CustomerProfilePageMainColumnProps = {
  profile: CustomerProfileDisplay;
  profileGrade: ConfidenceGradeValue;
  hasCleanRecord: boolean;
  merchantOrderCount: number;
  merchantNarrative: string;
  identitySignals: string[];
  transactions: RoadmapTransaction[];
  roadmapEvents: BehaviorRoadmapEvent[];
  identityTimeline: CustomerIntelligencePanel["identityTimeline"];
  variantCount: number;
  merchantSignalPills: MerchantSignalPill[];
  linkedAccounts: LinkedAccountRow[];
  activityLog: ActivityLogEntry[];
};

function compactTransactionTitle(tx: RoadmapTransaction): string {
  if (tx.chargeback_filed) return "Chargeback filed";
  if (tx.refund_claimed) return "Payout case recorded";
  return "Order placed";
}

function CompactTransactionList({
  transactions,
}: {
  transactions: RoadmapTransaction[];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No orders in dataset"
        description="No merchant-owned order history is available for this customer yet."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[var(--border)]">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-[var(--surface-sunken)] text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]"><tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Outcome</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
        <tbody className="divide-y divide-[var(--border-muted)]">
      {transactions.slice(0, 25).map((tx) => (
        <tr key={tx.order_id} className="hover:bg-[var(--surface-hover)]">
          <td className="px-3 py-3"><Link href={`/orders/${tx.source_order_id}`} className="font-mono text-xs font-semibold underline-offset-2 hover:underline">{tx.order_id}</Link></td>
          <td className="px-3 py-3 text-[var(--text-secondary)]">{formatDateAbsolute(tx.processed_at)}</td>
          <td className="px-3 py-3">{compactTransactionTitle(tx)}</td>
          <td className="px-3 py-3 text-right font-semibold tabular-nums">{formatMoneyOrDash(Math.round((Number(tx.order_value) || 0) * 100), tx.currency)}</td>
        </tr>
      ))}
        </tbody>
      </table>
    </div>
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
  void profile;
  void profileGrade;
  void hasCleanRecord;
  void merchantOrderCount;
  void identitySignals;
  void identityTimeline;
  void variantCount;
  void merchantSignalPills;
  void linkedAccounts;
  void roadmapEvents;
  void merchantNarrative;

  return (
    <div className="min-w-0 space-y-[var(--space-5)]">
      <SectionCard title="Orders" description="Recent orders from this store.">
        <CompactTransactionList transactions={transactions} />
      </SectionCard>

      <div id="cases"><CustomerSupportCasesSection profileId={profile.id} /></div>

      <SectionCard title="Merchant notes">
        <CustomerNotes customerProfileId={profile.id} />
      </SectionCard>

      <SectionCard title="Timeline">
        {activityLog.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Actions and changes will appear here."
          />
        ) : (
          <ol className="space-y-3">
            {activityLog.filter((entry) => entry.event_type !== 'claim_viewed').map((entry) => {
              const d = entry.event_data;
              const destinationStatus = [d.to_status, d.to, d.new_status].find(
                (value): value is string =>
                  typeof value === "string" && value.trim().length > 0,
              );
              const notePreview = [d.note_preview, d.note].find(
                (value): value is string =>
                  typeof value === "string" && value.trim().length > 0,
              );
              let description = "";
              switch (entry.event_type) {
                case "profile_created":
                  description =
                    "Customer context created from imported history";
                  break;
                case "status_changed":
                  description = destinationStatus
                    ? `Review status changed to ${labelize(destinationStatus)}`
                    : "Review status updated";
                  break;
                case "note_added":
                  description = notePreview
                    ? `Note added: ${notePreview}`
                    : "Note added";
                  break;
                case "note_deleted":
                  description = "Note removed";
                  break;
                case "watchlist_added":
                  description = "Legacy saved-case marker added";
                  break;
                case "watchlist_removed":
                  description = "Legacy saved-case marker removed";
                  break;
                case "evidence_generated":
                  description = `Evidence package generated (${d.reference_number})`;
                  break;
                case "audit_appearance":
                  description = `Appeared in ${d.audit_label ?? "an imported history run"} with ${d.score ?? ""} confidence`;
                  break;
                case "manually_reviewed":
                  description = "Marked as manually reviewed";
                  break;
                default:
                  description = labelize(entry.event_type);
              }
              return (
                <PanelCard
                  key={entry.id}
                  as="li"
                  variant="appInset"
                  className="flex items-start gap-3 p-3"
                >
                  <Activity
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-body-sm"
                      style={{ color: "var(--text)" }}
                    >
                      {description}
                    </p>
                    <p
                      className="text-caption"
                      style={{ color: "var(--text-tertiary)" }}
                      title={formatDateTime(entry.created_at)}
                    >
                      {formatDateMode(entry.created_at, "recent")}
                    </p>
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
