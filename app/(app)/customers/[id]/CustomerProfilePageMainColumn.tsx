import { Activity, AtSign, CreditCard, ExternalLink, Fingerprint, MapPin, Phone, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import CustomerNotes from "@/components/audit/CustomerNotes";
import CustomerSupportCasesSection from "@/components/customers/CustomerSupportCasesSection";
import { Badge, DataTableServer, EvidenceSpine, Panel } from "@/components/ui";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  formatMoneyOrDash,
  formatDateTime,
  formatDateAbsolute,
  formatDateMode,
  formatConfidencePercent,
} from "@/lib/utils/format";
import { formatFiledDate } from "@/lib/claims/sla";
import {
  labelize,
  customerClaimSummaryDisplay,
  type RoadmapTransaction,
  type CustomerDataCoverage,
} from "@/app/(app)/customers/[id]/customerProfilePageLabels";
import type {
  ActivityLogEntry,
  ClaimSummaryRow,
  CustomerProfileDisplay,
  IdentitySignalRow,
  IdentitySignalSummaryRow,
  LinkedAccountRow,
  MerchantSignalPill,
  PossibleMatchRow,
} from "@/app/(app)/customers/[id]/customerProfilePageLoad";
import type { CustomerIntelligencePanel } from "@/lib/customers/intelligencePanel";
import type { ConfidenceGradeValue } from "@/lib/confidence";
import type { BehaviorRoadmapEvent } from "@/components/customers/BehaviorRoadmap";

export type CustomerProfilePageMainColumnProps = {
  profile: CustomerProfileDisplay;
  profileGrade: ConfidenceGradeValue;
  identitySignals: string[];
  transactions: RoadmapTransaction[];
  roadmapEvents: BehaviorRoadmapEvent[];
  identityTimeline: CustomerIntelligencePanel["identityTimeline"];
  variantCount: number;
  merchantSignalPills: MerchantSignalPill[];
  linkedAccounts: LinkedAccountRow[];
  activityLog: ActivityLogEntry[];
  billingAddress: string | null;
  identitySignalRows: IdentitySignalRow[];
  identitySignalSummary: IdentitySignalSummaryRow[];
  possibleMatches: PossibleMatchRow[];
  latestClaim: ClaimSummaryRow | null;
  openClaimCount: number | null;
  orderCoverage: CustomerDataCoverage;
  caseCoverage: CustomerDataCoverage;
};

function CompactTransactionList({
  transactions,
}: {
  transactions: RoadmapTransaction[];
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        variant="compact"
        title="No orders in dataset"
        description="No merchant-owned order history is available for this customer yet."
        action={<Link href="/sources/connected" className="font-medium text-[13px] leading-5 text-[#1c1f23] text-[#9f4f08] hover:underline">Review connected sources</Link>}
      />
    );
  }

  const visibleTransactions = transactions.slice(0, 25);
  return (
    <DataTableServer
      aria-label="Customer order history"
      className="min-w-[640px]"
      rows={visibleTransactions}
      emptyState={<p className="text-[13px] leading-5 text-[#40454a] p-4 text-[#64686d]">No order history is available.</p>}
      getRowKey={(transaction) => transaction.order_id}
      columns={[
        {
          key: "order",
          header: "Order",
          render: (transaction) => {
            const lineItems = (transaction.line_items ?? []).filter((line) => line.title);
            const shownItems = lineItems.slice(0, 2);
            const extraItems = lineItems.length - shownItems.length;
            return (
              <div>
                <div className="flex items-center gap-1.5">
                  <Link href={`/orders/${transaction.source_order_id}`} className="font-medium text-[13px] leading-5 text-[#1c1f23] font-mono underline-offset-2 hover:underline">{transaction.order_id}</Link>
                  {transaction.external_href ? (
                    <a
                      href={transaction.external_href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open order in ${transaction.external_source ?? "source"}`}
                      title={`Open in ${transaction.external_source ?? "source"}`}
                      className="text-[#9f4f08] hover:text-[#1c1f23]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
                {transaction.via_email ? <span className="mt-1 block max-w-[190px] truncate text-[length:10.5px] text-[#6f6a63]">via {transaction.via_email}</span> : null}
                {shownItems.length > 0 ? (
                  <p className="mt-1 max-w-[220px] truncate text-[length:10.5px] text-[#6f6a63]">
                    {shownItems.map((line) => `${line.quantity ? `${line.quantity}× ` : ""}${line.title}`).join(", ")}
                    {extraItems > 0 ? ` +${extraItems} more` : ""}
                  </p>
                ) : null}
              </div>
            );
          },
        },
        {
          key: "date",
          header: "Date",
          render: (transaction) => <span className="text-[#64686d]">{formatDateAbsolute(transaction.processed_at)}</span>,
        },
        {
          key: "delivery",
          header: "Delivery",
          render: (transaction) => transaction.shipment ? (
            <span className="flex items-center gap-1 text-[length:10.5px] text-[#64686d]">
              <Truck className="h-3 w-3 shrink-0 text-[#6f6a63]" aria-hidden="true" />
              {labelize(transaction.shipment.status ?? "unknown")}
              {transaction.shipment.carrier ? ` · ${transaction.shipment.carrier}` : ""}
              {transaction.shipment.external_href ? (
                <a
                  href={transaction.shipment.external_href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open fulfilment in ${transaction.shipment.external_source ?? "source"}`}
                  title={`Open in ${transaction.shipment.external_source ?? "source"}`}
                  className="ml-0.5 text-[#9f4f08] hover:text-[#1c1f23]"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </span>
          ) : <span className="text-[length:10.5px] text-[#6f6a63]">—</span>,
        },
        {
          key: "outcome",
          header: "Outcome",
          render: (transaction) => transaction.chargeback_filed
            ? <Badge tone="danger" size="sm">Chargeback</Badge>
            : transaction.refund_claimed
              ? <Badge tone="neutral" size="sm">Case</Badge>
              : <span className="text-[length:10.5px] text-[#6f6a63]">—</span>,
        },
        {
          key: "amount",
          header: "Amount",
          kind: "currency",
          render: (transaction) => <span className="font-medium text-[13px] leading-5 text-[#1c1f23] tabular-nums">{formatMoneyOrDash(Math.round((Number(transaction.order_value) || 0) * 100), transaction.currency)}</span>,
        },
      ]}
    />
  );
}

function ChangesStrip({ events }: { events: BehaviorRoadmapEvent[] }) {
  const changes = events.filter((event) => event.type !== "order_placed").slice(0, 8);
  if (changes.length === 0) return null;
  return (
    <EvidenceSpine
      compact
      className="mt-3"
      label="Observed customer changes"
      items={changes.map((event) => ({
        key: event.id,
        authority: 'fact',
        label: 'Observed change',
        value: event.title,
        meta: <><span>{event.subtitle ?? 'Merchant-owned history'}</span><span>{formatDateAbsolute(event.date)}</span></>,
        state: 'recorded',
      }))}
    />
  );
}

export function CustomerProfilePageMainColumn({
  profile,
  profileGrade,
  identitySignals,
  transactions,
  roadmapEvents,
  identityTimeline,
  variantCount,
  merchantSignalPills,
  linkedAccounts,
  activityLog,
  billingAddress,
  identitySignalRows,
  identitySignalSummary,
  possibleMatches,
  latestClaim,
  openClaimCount,
  orderCoverage,
  caseCoverage,
}: CustomerProfilePageMainColumnProps) {
  void profileGrade;
  void identitySignals;
  void identitySignalRows;

  const contactRows = [
    { label: "Email", value: profile.primary_email ?? profile.emails[0], icon: AtSign },
    { label: "Phone", value: profile.phones[0], icon: Phone },
    { label: "Shipping address", value: profile.addresses[0], icon: MapPin },
    { label: "Billing address", value: billingAddress && billingAddress !== profile.addresses[0] ? billingAddress : undefined, icon: MapPin },
    { label: "Payment card", value: profile.card_last4s[0] ? `•••• ${profile.card_last4s[0]}` : undefined, icon: CreditCard },
  ].filter((row): row is { label: string; value: string; icon: typeof AtSign } => Boolean(row.value));

  const visibleActivity = activityLog.filter((entry) => entry.event_type !== 'claim_viewed');
  const latestClaimDisplay = latestClaim
    ? customerClaimSummaryDisplay(latestClaim)
    : null;

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-3">
        <SectionCard id="orders" title="Orders" description="What this customer bought, when it happened, and whether the order led to a case." actions={<span className="text-[10.5px] leading-4 text-[#6f6a63]">Latest {Math.min(transactions.length, 25)} of {transactions.length}{orderCoverage === 'complete' ? '' : ' observed · partial'}</span>}>
          <CompactTransactionList transactions={transactions} />
          <ChangesStrip events={roadmapEvents} />
        </SectionCard>

        <div id="cases"><CustomerSupportCasesSection profileId={profile.id} /></div>

        {latestClaim ? (
          <SectionCard title="Dispute context" description="Summary you can reference when responding in Gorgias, Zendesk, or Shopify.">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Open disputes"
                value={openClaimCount == null ? '' : `${openClaimCount}${caseCoverage === 'complete' ? '' : ' observed · partial'}`}
                availability={openClaimCount == null ? 'unavailable' : 'available'}
                density="compact"
              />
              <MetricCard label="Latest status" value={latestClaimDisplay!.status} density="compact" />
            </div>
            <div className="mt-3 rounded-md border border-[#eae8e5] bg-[#f4f3f1] p-3">
              <p className="text-[length:10.5px] text-[#6f6a63]">Latest dispute signal</p>
              <p className="font-medium text-[13px] leading-5 text-[#1c1f23] text-[#1c1f23]">{latestClaimDisplay!.claimType}</p>
              <p className="font-mono text-[length:10.5px] text-[#6f6a63]">{latestClaimDisplay!.orderReference}</p>
              <p className="mt-2 text-[length:10.5px] text-[#6f6a63]">Filed {formatFiledDate(latestClaim)}</p>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard id="notes" title="Merchant notes" description="Private context for your team about this customer.">
          <CustomerNotes customerProfileId={profile.id} />
        </SectionCard>

        <SectionCard id="activity" title="Customer activity" description="Actions taken by your team across this customer's linked cases.">
        {visibleActivity.length === 0 ? (
          <EmptyState
            variant="compact"
            title="No activity yet"
            description="Case status changes, evidence generation, and notes will appear here."
            action={<Link href={`/customers/${profile.id}/evidence/new`} className="font-medium text-[13px] leading-5 text-[#1c1f23] text-[#9f4f08] hover:underline">Add evidence</Link>}
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
                <Panel
                  key={entry.id}
                  as="li"
                  variant="inset"
                  className="flex items-start gap-3 p-3"
                >
                  <Activity
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "#64686d" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-body-sm"
                      style={{ color: "#1c1f23" }}
                    >
                      {description}
                    </p>
                    <p
                      className="text-caption"
                      style={{ color: "#6f6a63" }}
                      title={formatDateTime(entry.created_at)}
                    >
                      {formatDateMode(entry.created_at, "recent")}
                    </p>
                  </div>
                </Panel>
              );
            })}
          </ol>
        )}
        </SectionCard>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-20">
        <SectionCard title="Customer details" description="Contact and checkout details observed in your store." density="compact">
          {contactRows.length ? (
            <dl className="divide-y divide-[#eae8e5]">
              {contactRows.map(({ label, value, icon: Icon }) => (
                <div key={label} className="py-3 first:pt-0 last:pb-0">
                  <dt className="flex items-center gap-3 text-[length:10.5px] text-[#6f6a63]">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </dt>
                  <dd className="text-[13px] leading-5 text-[#40454a] mt-1 break-words pl-7 text-[#1c1f23]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[13px] leading-5 text-[#40454a] text-[#64686d]">
              Contact details are unavailable.
            </p>
          )}
          {(() => {
            const extras = [
              profile.emails.length > 1 ? `${profile.emails.length} emails` : null,
              profile.phones.length > 1 ? `${profile.phones.length} phones` : null,
              profile.addresses.length > 1 ? `${profile.addresses.length} addresses` : null,
            ].filter((v): v is string => Boolean(v));
            return extras.length ? <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-3 border-t border-[#eae8e5] pt-3">Also observed: {extras.join(', ')} across this store history.</p> : null;
          })()}
        </SectionCard>

        <SectionCard id="identity" title="Identity" description="Identifiers linked from merchant-owned activity." density="compact">
          {profile.sibling_count ? <div className="text-[11.5px] leading-[1.45] text-[#64686d] flex gap-2 rounded-md bg-[#edf6f8] p-3"><Fingerprint className="h-4 w-4 shrink-0 text-[#247388]" aria-hidden="true" /><span>{profile.sibling_count + 1} source customer records were resolved into this profile.</span></div> : null}
          {variantCount > 0 ? <div className={profile.sibling_count ? "mt-2" : ""}><Badge tone="info" size="sm">{variantCount} identity change{variantCount === 1 ? '' : 's'}</Badge></div> : null}
          {identitySignalSummary.length ? (
            <div className={profile.sibling_count || variantCount > 0 ? "mt-3 border-t border-[#eae8e5] pt-3" : ""}>
              <DataTableServer
                aria-label="Identity signal summary"
                className="min-w-[280px]"
                rows={identitySignalSummary}
                emptyState={<p className="text-[13px] leading-5 text-[#40454a] p-3 text-[#64686d]">No identity signals are available.</p>}
                getRowKey={(row) => row.signalType}
                density="metadata"
                columns={[
                  {
                    key: "type",
                    header: "Type",
                    render: (row) => labelize(row.signalType),
                  },
                  {
                    key: "distinct",
                    header: "Distinct",
                    kind: "numeric",
                    render: (row) => <span className="tabular-nums text-[#64686d]">{row.distinctCount}</span>,
                  },
                  {
                    key: "lastSeen",
                    header: "Last seen",
                    kind: "date",
                    render: (row) => <span className="tabular-nums text-[#6f6a63]">{formatDateAbsolute(row.lastSeenAt)}</span>,
                  },
                ]}
              />
            </div>
          ) : null}
          {linkedAccounts.length ? (
            <ul className="mt-3 space-y-1.5 border-t border-[#eae8e5] pt-3">
              {linkedAccounts.map((account) => (
                <li key={`${account.entityType}-${account.entityValue}`} className="rounded-[8px] border border-[#eae8e5] p-3">
                  <p className="font-medium text-[13px] leading-5 text-[#1c1f23] text-[#1c1f23]">{account.entityValue}</p>
                  <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1 tabular-nums">Derived linkage indicator: {account.linkageIndicatorPercent}%</p>
                  <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1">{account.basis}</p>
                  <p className="text-[10.5px] leading-4 text-[#6f6a63] mt-1">Heuristic indicator; not identity proof.</p>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>

        <SectionCard title="Observed changes" description="New identifiers first seen across the order history." density="compact">
          {identityTimeline.length ? <EvidenceSpine compact label="Identity observation chronology" items={identityTimeline.slice(-6).reverse().map((entry) => ({ key: `${entry.date}-${entry.field}-${entry.value}`, authority: 'fact', label: `${entry.isVariant ? 'New' : 'First'} ${labelize(entry.field)}`, value: entry.value, meta: formatDateAbsolute(entry.date), state: entry.isVariant ? 'partial' : 'recorded' }))} /> : <div className="text-[13px] leading-5 text-[#40454a] flex items-center gap-2 text-[#64686d]"><ShoppingBag className="h-4 w-4" aria-hidden="true" />No identifier history yet.</div>}
        </SectionCard>

        {possibleMatches.length ? (
          <SectionCard title="Possible matches" description="Other store records that share some evidence but weren't merged automatically." density="compact">
            <ul className="space-y-2">
              {possibleMatches.slice(0, 5).map((match) => (
                <li key={match.candidateId} className="rounded-md border border-[#eae8e5] bg-[#f4f3f1] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/customers/${match.candidateId}`} className="font-medium text-[13px] leading-5 text-[#1c1f23] min-w-0 truncate text-[#1c1f23] hover:underline">
                      {match.displayName || match.email || 'Unnamed customer'}
                    </Link>
                    {match.confidence != null ? <span className="shrink-0 text-[length:10.5px] tabular-nums text-[#6f6a63]">{formatConfidencePercent(match.confidence)}</span> : null}
                  </div>
                  {match.email && match.displayName ? <p className="mt-0.5 truncate text-[length:10.5px] text-[#6f6a63]">{match.email}</p> : null}
                  {match.matchedTypes.length ? <div className="mt-1.5 flex flex-wrap gap-1">{match.matchedTypes.map((type) => <Badge key={type} tone="neutral" size="sm">{labelize(type)}</Badge>)}</div> : null}
                </li>
              ))}
            </ul>
            {possibleMatches.length > 5 ? <p className="text-[10.5px] leading-4 text-[#6f6a63] mt-2">+{possibleMatches.length - 5} more not shown</p> : null}
          </SectionCard>
        ) : null}

        {merchantSignalPills.length ? <SectionCard title="Network context" description="Aggregate case types disclosed under privacy thresholds." density="compact"><div className="flex flex-wrap gap-2">{merchantSignalPills.slice(0, 12).map((signal, index) => <Badge key={`${signal.claimType}-${index}`} tone="neutral" size="sm">{signal.claimType}</Badge>)}</div></SectionCard> : null}
      </aside>
    </div>
  );
}
