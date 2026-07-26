import { Activity, AtSign, CreditCard, ExternalLink, Fingerprint, MapPin, Phone, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import CustomerNotes from "@/components/audit/CustomerNotes";
import CustomerSupportCasesSection from "@/components/customers/CustomerSupportCasesSection";
import { Badge, Panel } from "@/components/ui";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import {
  formatMoneyOrDash,
  formatDateTime,
  formatDateAbsolute,
  formatDateMode,
} from "@/lib/utils/format";
import { formatFiledDate } from "@/lib/claims/sla";
import {
  labelize,
  customerClaimSummaryDisplay,
  type RoadmapTransaction,
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
  openClaimCount: number;
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
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[var(--ua-border-default)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[var(--ua-surface-muted)] text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]"><tr><th className="px-3 py-2">Order</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Delivery</th><th className="px-3 py-2">Outcome</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
        <tbody className="divide-y divide-[var(--ua-border-subtle)]">
      {transactions.slice(0, 25).map((tx) => {
        const lineItems = (tx.line_items ?? []).filter((line) => line.title);
        const shownItems = lineItems.slice(0, 2);
        const extraItems = lineItems.length - shownItems.length;
        return (
        <tr key={tx.order_id} className="hover:bg-[var(--ua-surface-hover)]">
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Link href={`/orders/${tx.source_order_id}`} className="font-mono text-xs font-semibold underline-offset-2 hover:underline">{tx.order_id}</Link>
              {tx.external_href ? (
                <a
                  href={tx.external_href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open order in ${tx.external_source ?? "source"}`}
                  title={`Open in ${tx.external_source ?? "source"}`}
                  className="text-[var(--ua-action-primary)] hover:text-[var(--ua-text-primary)]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
            {tx.via_email ? <span className="mt-1 block max-w-[190px] truncate text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">via {tx.via_email}</span> : null}
            {shownItems.length > 0 ? (
              <p className="mt-1 max-w-[220px] truncate text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
                {shownItems.map((line) => `${line.quantity ? `${line.quantity}× ` : ""}${line.title}`).join(", ")}
                {extraItems > 0 ? ` +${extraItems} more` : ""}
              </p>
            ) : null}
          </td>
          <td className="px-3 py-2.5 text-[var(--ua-text-secondary)]">{formatDateAbsolute(tx.processed_at)}</td>
          <td className="px-3 py-2.5">
            {tx.shipment ? (
              <span className="flex items-center gap-1 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)]">
                <Truck className="h-3 w-3 shrink-0 text-[var(--ua-text-tertiary)]" aria-hidden="true" />
                {labelize(tx.shipment.status ?? "unknown")}
                {tx.shipment.carrier ? ` · ${tx.shipment.carrier}` : ""}
                {tx.shipment.external_href ? (
                  <a
                    href={tx.shipment.external_href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open fulfilment in ${tx.shipment.external_source ?? "source"}`}
                    title={`Open in ${tx.shipment.external_source ?? "source"}`}
                    className="ml-0.5 text-[var(--ua-action-primary)] hover:text-[var(--ua-text-primary)]"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </span>
            ) : <span className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">—</span>}
          </td>
          <td className="px-3 py-2.5">
            {tx.chargeback_filed ? <Badge tone="danger" size="sm">Chargeback</Badge> : tx.refund_claimed ? <Badge tone="warning" size="sm">Payout case</Badge> : <span className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">—</span>}
          </td>
          <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{formatMoneyOrDash(Math.round((Number(tx.order_value) || 0) * 100), tx.currency)}</td>
        </tr>
        );
      })}
        </tbody>
      </table>
    </div>
  );
}

function ChangesStrip({ events }: { events: BehaviorRoadmapEvent[] }) {
  const changes = events.filter((event) => event.type !== "order_placed").slice(0, 8);
  if (changes.length === 0) return null;
  return (
    <ul className="mt-3 divide-y divide-[var(--ua-border-subtle)] rounded-md border border-[var(--ua-border-default)]">
      {changes.map((event) => (
        <li key={event.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <span className="min-w-0 truncate text-[var(--ua-text-primary)]">{event.title}{event.subtitle ? <span className="ml-1.5 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">{event.subtitle}</span> : null}</span>
          <span className="shrink-0 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">{formatDateAbsolute(event.date)}</span>
        </li>
      ))}
    </ul>
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
        <SectionCard title="Orders" description="What this customer bought, when it happened, and whether the order led to a payout case." actions={<span className="text-xs text-[var(--ua-text-tertiary)]">Latest {Math.min(transactions.length, 25)} of {transactions.length}</span>}>
          <CompactTransactionList transactions={transactions} />
          <ChangesStrip events={roadmapEvents} />
        </SectionCard>

        <div id="cases"><CustomerSupportCasesSection profileId={profile.id} /></div>

        {latestClaim ? (
          <SectionCard title="Dispute context" description="Summary you can reference when responding in Gorgias, Zendesk, or Shopify.">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Open disputes" value={openClaimCount} density="compact" />
              <MetricCard label="Latest status" value={latestClaimDisplay!.status} density="compact" />
            </div>
            <div className="mt-3 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-3">
              <p className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">Latest dispute signal</p>
              <p className="text-sm font-semibold text-[var(--ua-text-primary)]">{latestClaimDisplay!.claimType}</p>
              <p className="font-mono text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">{latestClaimDisplay!.orderReference}</p>
              <p className="mt-2 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">Filed {formatFiledDate(latestClaim)}</p>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="Merchant notes" description="Private context for your team about this customer.">
          <CustomerNotes customerProfileId={profile.id} />
        </SectionCard>

        <SectionCard title="Customer activity" description="Actions taken by your team across this customer's linked payout cases.">
        {visibleActivity.length === 0 ? (
          <EmptyState
            variant="compact"
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
                <Panel
                  key={entry.id}
                  as="li"
                  variant="inset"
                  className="flex items-start gap-3 p-3"
                >
                  <Activity
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "var(--ua-text-secondary)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-body-sm"
                      style={{ color: "var(--ua-text-primary)" }}
                    >
                      {description}
                    </p>
                    <p
                      className="text-caption"
                      style={{ color: "var(--ua-text-tertiary)" }}
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
            <dl className="divide-y divide-[var(--ua-border-subtle)]">
              {contactRows.map(({ label, value, icon: Icon }) => (
                <div key={label} className="py-3 first:pt-0 last:pb-0">
                  <dt className="flex items-center gap-3 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </dt>
                  <dd className="mt-1 break-words pl-7 text-sm text-[var(--ua-text-primary)]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-[var(--ua-text-secondary)]">
              Contact details are unavailable.
            </p>
          )}
          {(() => {
            const extras = [
              profile.emails.length > 1 ? `${profile.emails.length} emails` : null,
              profile.phones.length > 1 ? `${profile.phones.length} phones` : null,
              profile.addresses.length > 1 ? `${profile.addresses.length} addresses` : null,
            ].filter((v): v is string => Boolean(v));
            return extras.length ? <p className="mt-3 border-t border-[var(--ua-border-subtle)] pt-3 text-xs text-[var(--ua-text-secondary)]">Also observed: {extras.join(', ')} across this store history.</p> : null;
          })()}
        </SectionCard>

        <SectionCard id="identity" title="Identity" description="Identifiers linked from merchant-owned activity." density="compact">
          {profile.sibling_count ? <div className="flex gap-2 rounded-md bg-[var(--ua-info-bg)] p-3 text-xs text-[var(--ua-text-secondary)]"><Fingerprint className="h-4 w-4 shrink-0 text-[var(--ua-info)]" aria-hidden="true" /><span>{profile.sibling_count + 1} source customer records were resolved into this profile.</span></div> : null}
          {variantCount > 0 ? <div className={profile.sibling_count ? "mt-2" : ""}><Badge tone="info" size="sm">{variantCount} identity change{variantCount === 1 ? '' : 's'}</Badge></div> : null}
          {identitySignalSummary.length ? (
            <div className={`overflow-x-auto ${profile.sibling_count || variantCount > 0 ? "mt-3 border-t border-[var(--ua-border-subtle)] pt-3" : ""}`}>
              <table className="w-full min-w-[280px] text-left text-xs">
                <thead className="text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]"><tr><th className="py-1 pr-2">Type</th><th className="py-1 pr-2 text-right">Distinct</th><th className="py-1 text-right">Last seen</th></tr></thead>
                <tbody className="divide-y divide-[var(--ua-border-subtle)]">
                  {identitySignalSummary.map((row) => (
                    <tr key={row.signalType}>
                      <td className="py-1.5 pr-2 text-[var(--ua-text-primary)]">{labelize(row.signalType)}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-[var(--ua-text-secondary)]">{row.distinctCount}</td>
                      <td className="py-1.5 text-right tabular-nums text-[var(--ua-text-tertiary)]">{formatDateAbsolute(row.lastSeenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {linkedAccounts.length ? (
            <ul className="mt-3 space-y-1.5 border-t border-[var(--ua-border-subtle)] pt-3">
              {linkedAccounts.map((account) => (
                <li key={`${account.entityType}-${account.entityValue}`} className="flex items-center justify-between gap-2 text-xs text-[var(--ua-text-secondary)]">
                  <span className="min-w-0 truncate">{account.entityValue}</span>
                  <span className="shrink-0 tabular-nums text-[var(--ua-text-tertiary)]">{Math.round(account.confidence * 100)}%</span>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>

        <SectionCard title="Observed changes" description="New identifiers first seen across the order history." density="compact">
          {identityTimeline.length ? <ol className="space-y-3">{identityTimeline.slice(-6).reverse().map((entry) => <li key={`${entry.date}-${entry.field}-${entry.value}`} className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${entry.isVariant ? 'bg-[var(--ua-warning)]' : 'bg-[var(--ua-text-tertiary)]'}`} /><div className="min-w-0"><p className="truncate text-xs font-medium text-[var(--ua-text-primary)]">{entry.value}</p><p className="mt-0.5 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">{entry.isVariant ? 'New ' : 'First '} {labelize(entry.field)} · {formatDateAbsolute(entry.date)}</p></div></li>)}</ol> : <div className="flex items-center gap-2 text-sm text-[var(--ua-text-secondary)]"><ShoppingBag className="h-4 w-4" aria-hidden="true" />No identifier history yet.</div>}
        </SectionCard>

        {possibleMatches.length ? (
          <SectionCard title="Possible matches" description="Other store records that share some evidence but weren't merged automatically." density="compact">
            <ul className="space-y-2">
              {possibleMatches.slice(0, 5).map((match) => (
                <li key={match.candidateId} className="rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/customers/${match.candidateId}`} className="min-w-0 truncate text-xs font-semibold text-[var(--ua-text-primary)] hover:underline">
                      {match.displayName || match.email || 'Unnamed customer'}
                    </Link>
                    {match.confidence != null ? <span className="shrink-0 text-[length:var(--ua-text-micro-size)] tabular-nums text-[var(--ua-text-tertiary)]">{Math.round(match.confidence * 100)}%</span> : null}
                  </div>
                  {match.email && match.displayName ? <p className="mt-0.5 truncate text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">{match.email}</p> : null}
                  {match.matchedTypes.length ? <div className="mt-1.5 flex flex-wrap gap-1">{match.matchedTypes.map((type) => <Badge key={type} tone="neutral" size="sm">{labelize(type)}</Badge>)}</div> : null}
                </li>
              ))}
            </ul>
            {possibleMatches.length > 5 ? <p className="mt-2 text-xs text-[var(--ua-text-tertiary)]">+{possibleMatches.length - 5} more not shown</p> : null}
          </SectionCard>
        ) : null}

        {merchantSignalPills.length ? <SectionCard title="Network context" description="Aggregate case types disclosed under privacy thresholds." density="compact"><div className="flex flex-wrap gap-2">{merchantSignalPills.slice(0, 12).map((signal, index) => <Badge key={`${signal.claimType}-${index}`} tone="neutral" size="sm">{signal.claimType}</Badge>)}</div></SectionCard> : null}
      </aside>
    </div>
  );
}
