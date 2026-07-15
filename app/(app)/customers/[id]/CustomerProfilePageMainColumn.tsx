import { Activity, AtSign, CreditCard, Fingerprint, Lightbulb, MapPin, Phone, ShoppingBag } from "lucide-react";
import Link from "next/link";
import CustomerNotes from "@/components/audit/CustomerNotes";
import CustomerSupportCasesSection from "@/components/customers/CustomerSupportCasesSection";
import { Badge, Card, DataTableServer } from "@/components/ui";
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
    <DataTableServer
      rows={transactions.slice(0, 25)}
      getRowKey={(tx) => tx.order_id}
      density="compact"
      emptyState={<EmptyState variant="compact" title="No orders in dataset" />}
      columns={[
        {
          key: "order",
          header: "Order",
          render: (tx) => <div><Link href={`/orders/${tx.source_order_id}`} className="font-mono text-xs font-semibold text-[var(--text-link)] underline-offset-2 hover:underline">{tx.order_id}</Link>{tx.via_email ? <span className="mt-1 block max-w-[190px] truncate text-[11px] text-[var(--text-tertiary)]">via {tx.via_email}</span> : null}</div>,
        },
        {
          key: "date",
          header: "Date",
          render: (tx) => <span className="text-[var(--text-secondary)]">{formatDateAbsolute(tx.processed_at)}</span>,
        },
        {
          key: "outcome",
          header: "Store outcome",
          render: (tx) => tx.chargeback_filed ? <Badge tone="danger" size="sm">Chargeback filed</Badge> : tx.refund_claimed ? <Badge tone="warning" size="sm">Payout case</Badge> : <Badge tone="success" size="sm">No linked case</Badge>,
        },
        {
          key: "amount",
          header: "Amount",
          align: "right" as const,
          render: (tx) => <span className="font-semibold tabular-nums">{formatMoneyOrDash(Math.round((Number(tx.order_value) || 0) * 100), tx.currency)}</span>,
        },
      ]}
    />
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
  void profileGrade;
  void identitySignals;
  void roadmapEvents;

  const contactRows = [
    { label: "Email", value: profile.primary_email ?? profile.emails[0], icon: AtSign },
    { label: "Phone", value: profile.phones[0], icon: Phone },
    { label: "Shipping address", value: profile.addresses[0], icon: MapPin },
    { label: "Payment card", value: profile.card_last4s[0] ? `•••• ${profile.card_last4s[0]}` : undefined, icon: CreditCard },
  ].filter((row): row is { label: string; value: string; icon: typeof AtSign } => Boolean(row.value));

  const visibleActivity = activityLog.filter((entry) => entry.event_type !== 'claim_viewed');

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-[var(--space-5)] lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-[var(--space-5)]">
        <SectionCard title="Store relationship" description="A concise readout based on this merchant's linked orders and payout cases.">
          <div className="flex items-start gap-3 rounded-md bg-[var(--surface-sunken)] p-4">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-secondary)]" aria-hidden="true" />
            <div><p className="text-sm leading-6 text-[var(--text-primary)]">{merchantNarrative}</p><div className="mt-3 flex flex-wrap gap-2"><Badge tone="neutral" size="sm">{merchantOrderCount} store orders</Badge>{hasCleanRecord ? <Badge tone="success" size="sm" dot>No linked case history</Badge> : <Badge tone="warning" size="sm" dot>Case history present</Badge>}{variantCount > 0 ? <Badge tone="info" size="sm">{variantCount} identity change{variantCount === 1 ? '' : 's'}</Badge> : null}</div></div>
          </div>
        </SectionCard>

        <SectionCard title="Order history" description="What this customer bought, when it happened, and whether the order led to a payout case." actions={<span className="text-xs text-[var(--text-tertiary)]">Latest {Math.min(transactions.length, 25)} of {transactions.length}</span>}>
          <CompactTransactionList transactions={transactions} />
        </SectionCard>

        <div id="cases"><CustomerSupportCasesSection profileId={profile.id} /></div>

        <SectionCard title="Merchant notes" description="Private context for your team about this customer.">
          <CustomerNotes customerProfileId={profile.id} />
        </SectionCard>

        <SectionCard title="Customer activity" description="Actions taken by your team across this customer's linked payout cases.">
        {visibleActivity.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Case status changes, evidence generation, and notes will appear here."
          />
        ) : (
          <ol className="space-y-3">
            {visibleActivity.map((entry) => {
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
                <Card unstyled
                  key={entry.id}
                  as="li"
                  variant="inset"
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
                </Card>
              );
            })}
          </ol>
        )}
        </SectionCard>
      </div>

      <aside className="space-y-[var(--space-5)] lg:sticky lg:top-20">
        <SectionCard title="Customer details" description="Contact and checkout details observed in your store." density="compact">
          {contactRows.length ? <dl className="divide-y divide-[var(--border-muted)]">{contactRows.map(({ label, value, icon: Icon }) => <div key={label} className="flex gap-3 py-3 first:pt-0 last:pb-0"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" /><div className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">{label}</dt><dd className="mt-1 break-words text-sm text-[var(--text-primary)]">{value}</dd></div></div>)}</dl> : <p className="text-sm text-[var(--text-secondary)]">Contact details are unavailable.</p>}
          {(profile.emails.length > 1 || profile.phones.length > 1 || profile.addresses.length > 1) ? <p className="mt-3 border-t border-[var(--border-muted)] pt-3 text-xs text-[var(--text-secondary)]">Also observed: {profile.emails.length} emails, {profile.phones.length} phones, and {profile.addresses.length} addresses across this store history.</p> : null}
        </SectionCard>

        <SectionCard title="Identity footprint" description="Identifiers linked from merchant-owned activity." density="compact">
          <div className="grid grid-cols-2 gap-2">
            {[['Emails', profile.emails.length], ['Addresses', profile.addresses.length], ['Cards', profile.card_last4s.length], ['Devices / IPs', profile.ips.length]].map(([label, value]) => <div key={label} className="rounded-md border border-[var(--border-muted)] bg-[var(--surface-sunken)] p-3"><div className="text-lg font-semibold tabular-nums">{value}</div><div className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{label}</div></div>)}
          </div>
          {profile.sibling_count ? <div className="mt-3 flex gap-2 rounded-md bg-[var(--info-bg)] p-3 text-xs text-[var(--text-secondary)]"><Fingerprint className="h-4 w-4 shrink-0 text-[var(--info)]" aria-hidden="true" /><span>{profile.sibling_count + 1} source customer records were resolved into this profile.</span></div> : null}
          {linkedAccounts.length ? <ul className="mt-3 space-y-2">{linkedAccounts.map((account) => <li key={`${account.entityType}-${account.entityValue}`} className="text-xs text-[var(--text-secondary)]">{account.entityValue}</li>)}</ul> : null}
        </SectionCard>

        <SectionCard title="Observed changes" description="New identifiers first seen across the order history." density="compact">
          {identityTimeline.length ? <ol className="space-y-3">{identityTimeline.slice(-6).reverse().map((entry) => <li key={`${entry.date}-${entry.field}-${entry.value}`} className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${entry.isVariant ? 'bg-[var(--warning)]' : 'bg-[var(--text-tertiary)]'}`} /><div className="min-w-0"><p className="truncate text-xs font-medium text-[var(--text-primary)]">{entry.value}</p><p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">{entry.isVariant ? 'New ' : 'First '} {labelize(entry.field)} · {formatDateAbsolute(entry.date)}</p></div></li>)}</ol> : <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"><ShoppingBag className="h-4 w-4" aria-hidden="true" />No identifier history yet.</div>}
        </SectionCard>

        {merchantSignalPills.length ? <SectionCard title="Network context" description="Aggregate case types disclosed under privacy thresholds." density="compact"><div className="flex flex-wrap gap-2">{merchantSignalPills.slice(0, 12).map((signal, index) => <Badge key={`${signal.claimType}-${index}`} tone="neutral" size="sm">{signal.claimType}</Badge>)}</div></SectionCard> : null}
      </aside>
    </div>
  );
}
