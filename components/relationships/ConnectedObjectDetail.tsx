import Link from "next/link";
import {
  ExternalLink,
} from "lucide-react";
import type {
  ObjectConversationEntry,
  ObjectFact,
  ObjectItem,
  ObjectSummary,
} from "@/lib/relationships/objectSummary";
import { InsetGroup, JoinedSection, Surface } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrencyNullable, formatDateTime, formatNumber } from "@/lib/utils/format";
import { objectDisplayRef } from "@/lib/ui/displayRef";
import { DetailPageShell } from "@/components/workbench/DetailPageShell";

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}
function factValue(item: ObjectFact) {
  if (item.kind === "money")
    return typeof item.value === "number"
      ? formatCurrencyNullable(item.value, item.currency)
      : "Unavailable";
  if (item.kind === "date")
    return typeof item.value === "string"
      ? formatDateTime(item.value)
      : "Unavailable";
  if (item.kind === "boolean")
    return item.value === true
      ? "Yes"
      : item.value === false
        ? "No"
        : "Unavailable";
  if (item.kind === "number" && typeof item.value === "number")
    return formatNumber(item.value);
  return String(item.value ?? "Unavailable").replaceAll("_", " ");
}

function isCommerceObject(type: ObjectSummary["type"]) {
  return type === "order" || type === "refund" || type === "return" || type === "shipment";
}

function titleFor(object: ObjectSummary) {
  if (object.type === "ticket") {
    const subject = object.facts.find((item) => item.label === "Subject")?.value;
    return typeof subject === "string" && subject.trim() ? subject : "Support ticket";
  }
  if (object.type === "dispute") {
    const disputeType = object.facts.find((item) => item.label === "Dispute type")?.value;
    return typeof disputeType === "string" && disputeType.trim()
      ? `${label(disputeType)} dispute`
      : "Dispute";
  }
  return objectDisplayRef(object.type, object.reference, object.id);
}

function safeReturnPath(returnTo: string | undefined) {
  return returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : null;
}

function itemTitle(type: ObjectSummary["type"]) {
  if (type === "shipment") return "Shipment items";
  if (type === "refund") return "Related order items";
  if (type === "return") return "Order items";
  return "Items";
}

function itemSummary(item: ObjectItem) {
  const parts = [
    item.sku ? `SKU ${item.sku}` : null,
    item.quantity === null ? null : `Quantity ${formatNumber(item.quantity)}`,
    item.amount === null ? null : formatCurrencyNullable(item.amount, item.currency),
  ].filter(Boolean);
  return parts.join(" · ") || "Source item details unavailable";
}

function conversationTitle(entry: ObjectConversationEntry) {
  if (entry.kind === "message")
    return entry.actor ? `${label(entry.actor)} message` : "Message";
  return label(entry.title);
}

function connectedReturnPath(object: ObjectSummary) {
  return `/${object.type}s/${object.id}`;
}

function CommerceConnectedObjectDetail({
  object,
  returnTo,
}: {
  object: ObjectSummary;
  returnTo?: string;
}) {
  const sourceUpdatedAt = object.provenance?.sourceUpdatedAt ?? object.provenance?.lastSyncedAt ?? object.updatedAt;
  const returnPath = safeReturnPath(returnTo);
  const backHref = returnPath ?? "/customers";
  const backLabel = returnPath ? "Previous task" : "Customers";
  const customer = object.customer;
  const financialFacts = object.facts.filter((item) => item.kind === "money");
  const operationalFacts = object.facts.filter((item) => item.kind !== "money");
  const linkedRecords = object.connected.filter((item) => item.type !== "customer");
  const lifecycleTitle = object.type === "shipment" ? "Tracking milestones" : "Lifecycle";

  return (
    <DetailPageShell
      backHref={backHref}
      backLabel={backLabel}
      eyebrow={`${label(object.type)} record`}
      title={titleFor(object)}
      subtitle={object.type === "shipment" ? "Carrier and delivery context" : "Connected source record"}
      statusBadge={<StatusBadge family="workflowStatus" value={object.state ?? "unknown"} />}
      meta={[
        { label: "Source", value: label(object.provenance?.sourceSystem ?? object.provider ?? "connected source") },
        ...(customer
          ? [{ label: "Customer", value: <Link href={customer.href}>{customer.reference}</Link> }]
          : []),
        { label: "Updated", value: sourceUpdatedAt ? formatDateTime(sourceUpdatedAt) : "Time unavailable" },
      ]}
      actions={
        object.provenance?.sourceUrl ? (
          <a
            href={object.provenance.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ua-text-label inline-flex h-7 items-center gap-1.5 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 hover:bg-[var(--ua-surface-hover)]"
          >
            Open in {label(object.provenance.sourceSystem)} <ExternalLink className="h-3 w-3" />
          </a>
        ) : undefined
      }
    >
      <Surface structure="working" data-testid="commerce-object-detail">
        {financialFacts.length ? (
          <JoinedSection className="ua-connected-object-lead" aria-labelledby="commerce-financial-context">
            <h2 id="commerce-financial-context" className="ua-text-working-title text-[var(--ua-text-primary)]">Financial context</h2>
            <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              {financialFacts.map((item) => (
                <div key={item.label}>
                  <dt className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{item.label}</dt>
                  <dd className="mt-1 ua-text-working-title text-[var(--ua-text-primary)]">{factValue(item)}</dd>
                </div>
              ))}
            </dl>
          </JoinedSection>
        ) : null}
        {operationalFacts.length ? (
          <JoinedSection aria-labelledby="commerce-object-facts">
            <h2 id="commerce-object-facts" className="ua-text-working-title text-[var(--ua-text-primary)]">Record details</h2>
            <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              {operationalFacts.map((item) => (
                <div key={item.label}>
                  <dt className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{item.label}</dt>
                  <dd className="mt-1 break-words text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-primary)]">{factValue(item)}</dd>
                </div>
              ))}
            </dl>
          </JoinedSection>
        ) : null}
        <JoinedSection aria-labelledby="commerce-items">
          <h2 id="commerce-items" className="ua-text-working-title text-[var(--ua-text-primary)]">{itemTitle(object.type)}</h2>
          {object.items.length ? (
            <ul className="mt-3 divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
              {object.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-primary)]">{item.title}</span>
                  <span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">{itemSummary(item)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">No item-level source records are available.</p>
          )}
        </JoinedSection>
        <JoinedSection aria-labelledby="commerce-lifecycle">
          <h2 id="commerce-lifecycle" className="ua-text-working-title text-[var(--ua-text-primary)]">{lifecycleTitle}</h2>
          {object.timeline.length ? (
            <ol className="relative mt-3 divide-y divide-[var(--ua-border-subtle)] before:absolute before:bottom-5 before:left-[9px] before:top-5 before:w-px before:bg-[var(--ua-border-default)]">
              {object.timeline.map((item) => (
                <li key={`${item.label}-${item.at ?? "unknown"}-${item.detail ?? ""}`} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5 py-3">
                  <span className="z-10 mt-1 h-2 w-2 justify-self-center rounded-full bg-[var(--ua-action-primary)] ring-2 ring-[var(--ua-surface-primary)]" />
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-[length:var(--ua-text-metadata-size)]">{item.label}</strong>
                      <time className="tabular-nums text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]" dateTime={item.at ?? undefined}>
                        {item.at ? formatDateTime(item.at) : "Time unavailable"}
                      </time>
                    </div>
                    {item.detail ? <p className="mt-1 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">{label(item.detail)}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">No source lifecycle timestamps are available.</p>
          )}
        </JoinedSection>
        <JoinedSection aria-labelledby="commerce-connected-records">
          <h2 id="commerce-connected-records" className="ua-text-working-title text-[var(--ua-text-primary)]">Connected records</h2>
          {linkedRecords.length ? (
            <ul className="mt-3 divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
              {linkedRecords.map((connected) => (
                <li key={`${connected.type}:${connected.id}`}>
                  <Link href={`${connected.href}?return=${encodeURIComponent(`/${object.type}s/${object.id}`)}`} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2.5 hover:bg-[var(--ua-surface-hover)]">
                    <span className="min-w-0">
                      <span className="block text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">{label(connected.type)}</span>
                      <span className="ua-text-working-title block break-words text-[var(--ua-text-primary)]">{objectDisplayRef(connected.type, connected.reference, connected.id)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[length:var(--ua-text-metadata-size)]">
                      {connected.state ? <StatusBadge family="workflowStatus" value={connected.state} size="sm" /> : null}
                      <span className="text-[var(--ua-action-primary)]">Open</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">No linked customer, case, or source record is available.</p>
          )}
        </JoinedSection>
        <JoinedSection aria-labelledby="commerce-provenance">
          <h2 id="commerce-provenance" className="ua-text-working-title text-[var(--ua-text-primary)]">Source and freshness</h2>
          <InsetGroup className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="connected-object-provenance">
            <span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">From {label(object.provenance?.sourceSystem ?? object.provider ?? "connected source")}</span>
            <StatusBadge family="workflowStatus" value={object.provenance?.freshness ?? "unknown"} size="sm" />
            <StatusBadge family="workflowStatus" value={object.provenance?.syncState ?? "unknown"} size="sm" />
            <span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{sourceUpdatedAt ? `Source updated ${formatDateTime(sourceUpdatedAt)}` : "Source update time unavailable"}</span>
          </InsetGroup>
        </JoinedSection>
      </Surface>
    </DetailPageShell>
  );
}

/**
 * Phase 20 deliberately shares the Phase-19 detail shell while letting a
 * support ticket lead with its actual conversation and a dispute lead with its
 * financial and source lifecycle facts. Neither route creates a second case
 * timeline or treats provider identifiers as merchant-facing identity.
 */
function SupportConnectedObjectDetail({
  object,
  returnTo,
}: {
  object: ObjectSummary;
  returnTo?: string;
}) {
  const sourceUpdatedAt = object.provenance?.sourceUpdatedAt ?? object.provenance?.lastSyncedAt ?? object.updatedAt;
  const returnPath = safeReturnPath(returnTo);
  const backHref = returnPath ?? "/customers";
  const backLabel = returnPath ? "Previous task" : "Customers";
  const financialFacts = object.facts.filter((item) => item.kind === "money");
  const operationalFacts = object.facts.filter(
    (item) => item.kind !== "money" && !(object.type === "ticket" && item.label === "Subject"),
  );
  const linkedRecords = object.connected.filter((item) => item.type !== "customer");
  const isTicket = object.type === "ticket";

  return (
    <DetailPageShell
      backHref={backHref}
      backLabel={backLabel}
      eyebrow={isTicket ? "Support ticket" : "Dispute record"}
      title={titleFor(object)}
      subtitle={isTicket ? "Customer conversation and linked operational context" : "Payment dispute and connected operational context"}
      statusBadge={<StatusBadge family="workflowStatus" value={object.state ?? "unknown"} />}
      meta={[
        { label: "Source", value: label(object.provenance?.sourceSystem ?? object.provider ?? "connected source") },
        ...(object.customer
          ? [{ label: "Customer", value: <Link href={object.customer.href}>{object.customer.reference}</Link> }]
          : []),
        { label: "Updated", value: sourceUpdatedAt ? formatDateTime(sourceUpdatedAt) : "Time unavailable" },
      ]}
      actions={
        object.provenance?.sourceUrl ? (
          <a
            href={object.provenance.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ua-text-label inline-flex h-7 items-center gap-1.5 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 hover:bg-[var(--ua-surface-hover)]"
          >
            Open in {label(object.provenance.sourceSystem)} <ExternalLink className="h-3 w-3" />
          </a>
        ) : undefined
      }
    >
      <Surface structure="working" data-testid="support-object-detail">
        {isTicket ? (
          <JoinedSection className="ua-connected-object-lead" aria-labelledby="ticket-conversation">
            <h2 id="ticket-conversation" className="ua-text-working-title text-[var(--ua-text-primary)]">Conversation and activity</h2>
            {object.conversation.length ? (
              <ol className="mt-3 divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
                {object.conversation.map((entry) => (
                  <li key={`${entry.kind}:${entry.id}`} className="px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-primary)]">{conversationTitle(entry)}</strong>
                      <time className="tabular-nums text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]" dateTime={entry.at ?? undefined}>
                        {entry.at ? formatDateTime(entry.at) : "Time unavailable"}
                      </time>
                    </div>
                    {entry.summary ? <p className="mt-1 text-[length:var(--ua-text-metadata-size)] leading-5 text-[var(--ua-text-secondary)]">{entry.summary}</p> : null}
                    {entry.visibility ? <p className="mt-1 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{label(entry.visibility)}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">No messages or ticket activity are available from this source.</p>
            )}
          </JoinedSection>
        ) : null}
        {financialFacts.length ? (
          <JoinedSection className={!isTicket ? "ua-connected-object-lead" : undefined} aria-labelledby="support-financial-context">
            <h2 id="support-financial-context" className="ua-text-working-title text-[var(--ua-text-primary)]">Financial context</h2>
            <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              {financialFacts.map((item) => (
                <div key={item.label}>
                  <dt className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{item.label}</dt>
                  <dd className="mt-1 ua-text-working-title text-[var(--ua-text-primary)]">{factValue(item)}</dd>
                </div>
              ))}
            </dl>
          </JoinedSection>
        ) : null}
        {operationalFacts.length ? (
          <JoinedSection aria-labelledby="support-record-details">
            <h2 id="support-record-details" className="ua-text-working-title text-[var(--ua-text-primary)]">{isTicket ? "Ticket details" : "Dispute details"}</h2>
            <dl className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              {operationalFacts.map((item) => (
                <div key={item.label}>
                  <dt className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{item.label}</dt>
                  <dd className="mt-1 break-words text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-primary)]">{factValue(item)}</dd>
                </div>
              ))}
            </dl>
          </JoinedSection>
        ) : null}
        {!isTicket ? (
          <JoinedSection aria-labelledby="dispute-lifecycle">
            <h2 id="dispute-lifecycle" className="ua-text-working-title text-[var(--ua-text-primary)]">Dispute lifecycle</h2>
            {object.timeline.length ? (
              <ol className="relative mt-3 divide-y divide-[var(--ua-border-subtle)] before:absolute before:bottom-5 before:left-[9px] before:top-5 before:w-px before:bg-[var(--ua-border-default)]">
                {object.timeline.map((item) => (
                  <li key={`${item.label}-${item.at ?? "unknown"}-${item.detail ?? ""}`} className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5 py-3">
                    <span className="z-10 mt-1 h-2 w-2 justify-self-center rounded-full bg-[var(--ua-action-primary)] ring-2 ring-[var(--ua-surface-primary)]" />
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-[length:var(--ua-text-metadata-size)]">{item.label}</strong>
                        <time className="tabular-nums text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]" dateTime={item.at ?? undefined}>{item.at ? formatDateTime(item.at) : "Time unavailable"}</time>
                      </div>
                      {item.detail ? <p className="mt-1 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">{label(item.detail)}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="mt-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">No source lifecycle timestamps are available.</p>}
          </JoinedSection>
        ) : null}
        {object.evidence.length ? (
          <JoinedSection aria-labelledby="support-case-evidence">
            <h2 id="support-case-evidence" className="ua-text-working-title text-[var(--ua-text-primary)]">Case evidence</h2>
            <ul className="mt-3 divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
              {object.evidence.map((item) => (
                <li key={item.id} className="px-3 py-2.5">
                  <strong className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-primary)]">{item.title}</strong>
                  <p className="mt-1 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">{item.summary}</p>
                </li>
              ))}
            </ul>
          </JoinedSection>
        ) : null}
        <JoinedSection aria-labelledby="support-connected-records">
          <h2 id="support-connected-records" className="ua-text-working-title text-[var(--ua-text-primary)]">Connected records</h2>
          {linkedRecords.length ? (
            <ul className="mt-3 divide-y divide-[var(--ua-border-subtle)] border-y border-[var(--ua-border-subtle)]">
              {linkedRecords.map((connected) => (
                <li key={`${connected.type}:${connected.id}`}>
                  <Link href={`${connected.href}?return=${encodeURIComponent(connectedReturnPath(object))}`} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2.5 hover:bg-[var(--ua-surface-hover)]">
                    <span className="min-w-0">
                      <span className="block text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">{label(connected.type)}</span>
                      <span className="ua-text-working-title block break-words text-[var(--ua-text-primary)]">{objectDisplayRef(connected.type, connected.reference, connected.id)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[length:var(--ua-text-metadata-size)]">
                      {connected.state ? <StatusBadge family="workflowStatus" value={connected.state} size="sm" /> : null}
                      <span className="text-[var(--ua-action-primary)]">Open</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">No linked customer, case, order, or refund record is available.</p>}
        </JoinedSection>
        <JoinedSection aria-labelledby="support-provenance">
          <h2 id="support-provenance" className="ua-text-working-title text-[var(--ua-text-primary)]">Source and freshness</h2>
          <InsetGroup className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="support-object-provenance">
            <span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-secondary)]">From {label(object.provenance?.sourceSystem ?? object.provider ?? "connected source")}</span>
            <StatusBadge family="workflowStatus" value={object.provenance?.freshness ?? "unknown"} size="sm" />
            <StatusBadge family="workflowStatus" value={object.provenance?.syncState ?? "unknown"} size="sm" />
            <span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{sourceUpdatedAt ? `Source updated ${formatDateTime(sourceUpdatedAt)}` : "Source update time unavailable"}</span>
          </InsetGroup>
        </JoinedSection>
      </Surface>
    </DetailPageShell>
  );
}

/**
 * Commerce records use the Phase 19 joined-detail composition. Dispute and
 * ticket content uses the same shell with its distinct Phase-20 evidence order.
 */
export function ConnectedObjectDetail({
  object,
  returnTo,
}: {
  object: ObjectSummary;
  returnTo?: string;
}) {
  if (isCommerceObject(object.type)) {
    return <CommerceConnectedObjectDetail object={object} returnTo={returnTo} />;
  }
  return <SupportConnectedObjectDetail object={object} returnTo={returnTo} />;
}
