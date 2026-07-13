import Link from "next/link";
import {
  Clock3 as Timeline,
  ExternalLink,
  FileCheck2,
  Link2,
  Radio,
} from "lucide-react";
import type {
  ObjectFact,
  ObjectSummary,
} from "@/lib/relationships/objectSummary";
import { PanelCard, StatusBadge } from "@/components/ui";
import type { StatusBadgeVariant } from "@/components/ui/tokens";
import { formatCurrencyNullable, formatDateTime, formatNumber } from "@/lib/utils/format";

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}
function statusVariant(value: string | null | undefined): StatusBadgeVariant {
  const status = (value ?? "").toLowerCase();
  if (
    [
      "block",
      "deny",
      "reject",
      "overdue",
      "error",
      "disabled",
      "unrecoverable",
      "failed",
      "stale",
    ].some((part) => status.includes(part))
  )
    return "blocked";
  if (
    [
      "clear",
      "complete",
      "connected",
      "active",
      "paid",
      "resolved",
      "closed",
      "ready",
      "approved",
      "fresh",
      "current",
      "high",
    ].some((part) => status.includes(part))
  )
    return "cleared";
  if (
    ["hold", "manual", "review", "medium", "pending"].some((part) =>
      status.includes(part),
    )
  )
    return "held";
  return "flagged";
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

export function ConnectedObjectDetail({
  object,
  returnTo,
}: {
  object: ObjectSummary;
  returnTo?: string;
}) {
  return (
    <main
      className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6"
      data-testid="connected-object-detail"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {returnTo?.startsWith("/") ? (
          <Link
            href={returnTo}
            className="text-sm font-semibold text-[var(--accent)]"
          >
            ← Return to previous task
          </Link>
        ) : (
          <Link
            href="/customers"
            className="text-sm font-semibold text-[var(--accent)]"
          >
            ← Customers
          </Link>
        )}
        {object.provenance?.sourceUrl ? (
          <a
            href={object.provenance.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]"
          >
            Open in {label(object.provenance.sourceSystem)}{" "}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
      <header className="border-b border-[var(--border-muted)] pb-5">
        <p className="text-sm text-[var(--text-secondary)]">
          {label(object.type)} source record
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="break-all text-2xl font-semibold text-[var(--text-primary)]">
            {object.reference}
          </h1>
          {object.state ? (
            <StatusBadge variant={statusVariant(object.state)}>
              {label(object.state)}
            </StatusBadge>
          ) : (
            <StatusBadge variant="held">State unavailable</StatusBadge>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
          Object-specific facts below preserve the connected source’s values.
          Unavailable fields stay explicit and are never inferred from a
          different record.
        </p>
      </header>
      <section aria-labelledby="object-facts-heading">
        <h2 id="object-facts-heading" className="text-base font-semibold">
          {label(object.type)} facts
        </h2>
        {object.facts.length ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {object.facts.map((item) => (
              <PanelCard key={item.label} variant="appInset" className="p-3">
                <dt className="text-xs text-[var(--text-tertiary)]">
                  {item.label}
                </dt>
                <dd className="mt-1 break-words text-sm font-medium text-[var(--text-primary)]">
                  {factValue(item)}
                </dd>
              </PanelCard>
            ))}
          </dl>
        ) : (
          <PanelCard
            variant="appInset"
            className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
          >
            This source supplied no additional typed facts.
          </PanelCard>
        )}
      </section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="object-timeline-heading">
          <div className="flex items-center gap-2">
            <Timeline className="h-4 w-4" />
            <h2
              id="object-timeline-heading"
              className="text-base font-semibold"
            >
              Lifecycle
            </h2>
          </div>
          {object.timeline.length ? (
            <ol className="relative mt-3 space-y-2 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-[var(--border)]">
              {object.timeline.map((item) => (
                <PanelCard
                  key={`${item.label}-${item.at ?? 'unknown'}-${item.detail ?? ''}`}
                  as="li"
                  variant="app"
                  className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 p-3"
                >
                  <span className="z-10 mt-0.5 h-2.5 w-2.5 justify-self-center rounded-full bg-[var(--accent)] ring-4 ring-[var(--surface)]" />
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">{item.label}</strong>
                      <time
                        className="font-mono text-[11px] text-[var(--text-tertiary)]"
                        dateTime={item.at ?? undefined}
                      >
                        {item.at ? formatDateTime(item.at) : "Time unavailable"}
                      </time>
                    </div>
                    {item.detail ? (
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {label(item.detail)}
                      </p>
                    ) : null}
                  </div>
                </PanelCard>
              ))}
            </ol>
          ) : (
            <PanelCard
              variant="appInset"
              className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
            >
              No source lifecycle timestamps are available.
            </PanelCard>
          )}
        </section>
        <section aria-labelledby="object-provenance-heading">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4" />
            <h2
              id="object-provenance-heading"
              className="text-base font-semibold"
            >
              Provenance and freshness
            </h2>
          </div>
          <PanelCard variant="app" className="mt-3 p-4">
            {object.provenance ? (
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-[var(--text-tertiary)]">
                    Source system
                  </dt>
                  <dd className="mt-1 font-medium">
                    {label(object.provenance.sourceSystem)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-tertiary)]">
                    External ID
                  </dt>
                  <dd className="mt-1 break-all font-mono text-xs">
                    {object.provenance.externalId}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs text-[var(--text-tertiary)]">
                      Freshness
                    </dt>
                    <dd className="mt-1">
                      <StatusBadge
                        variant={statusVariant(object.provenance.freshness)}
                      >
                        {label(object.provenance.freshness)}
                      </StatusBadge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--text-tertiary)]">
                      Sync state
                    </dt>
                    <dd className="mt-1">
                      <StatusBadge
                        variant={statusVariant(object.provenance.syncState)}
                      >
                        {label(object.provenance.syncState)}
                      </StatusBadge>
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-tertiary)]">
                    Last synced
                  </dt>
                  <dd className="mt-1">
                    {object.provenance.lastSyncedAt
                      ? formatDateTime(object.provenance.lastSyncedAt)
                      : "Timestamp unavailable"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--text-tertiary)]">
                    Connector version
                  </dt>
                  <dd className="mt-1 font-mono text-xs">
                    {object.provenance.connectorVersion ?? "Not recorded"}
                  </dd>
                </div>
                {object.provenance.payloadHash ? (
                  <div>
                    <dt className="text-xs text-[var(--text-tertiary)]">
                      Payload integrity
                    </dt>
                    <dd className="mt-1 break-all font-mono text-[11px]">
                      {object.provenance.payloadHash}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <div>
                <p className="text-sm font-medium">Canonical row present</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  The source registry has no matching provenance row, so
                  connector version and freshness cannot be claimed.
                </p>
                <dl className="mt-3 space-y-2 text-xs">
                  <div>
                    <dt className="text-[var(--text-tertiary)]">Source ID</dt>
                    <dd className="break-all font-mono">
                      {object.sourceId ?? "Not supplied"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-tertiary)]">
                      Observed provider
                    </dt>
                    <dd>{object.provider ?? "Imported source record"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-tertiary)]">Row updated</dt>
                    <dd>
                      {object.updatedAt
                        ? formatDateTime(object.updatedAt)
                        : "Timestamp unavailable"}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </PanelCard>
        </section>
      </div>
      <section aria-labelledby="object-evidence-heading">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4" />
          <h2 id="object-evidence-heading" className="text-base font-semibold">
            Evidence used by payout cases
          </h2>
        </div>
        {object.evidence.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {object.evidence.map((item) => (
              <PanelCard key={item.id} variant="app" className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm">{item.title}</strong>
                  <StatusBadge variant={statusVariant(item.confidence)}>
                    {label(item.confidence)}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {item.summary}
                </p>
                <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                  {label(item.provider)} · {label(item.type)}
                  {item.occurredAt ? ` · ${formatDateTime(item.occurredAt)}` : ""}
                </p>
                {item.reference ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-[var(--text-tertiary)]">
                    {item.reference}
                  </p>
                ) : null}
              </PanelCard>
            ))}
          </div>
        ) : (
          <PanelCard
            variant="appInset"
            className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
          >
            No typed evidence items are connected through this object’s payout
            cases.
          </PanelCard>
        )}
      </section>
      <section aria-labelledby="connected-heading">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          <h2 id="connected-heading" className="text-base font-semibold">
            Connected records
          </h2>
        </div>
        {object.connected.length ? (
          <ul className="mt-3 divide-y divide-[var(--border-muted)] rounded-lg border border-[var(--border)]">
            {object.connected.map((connected) => (
              <li key={`${connected.type}:${connected.id}`}>
                <Link
                  href={`${connected.href}?return=${encodeURIComponent(`/${object.type}s/${object.id}`)}`}
                  className="flex min-h-14 flex-col items-start justify-between gap-2 px-3 py-3 hover:bg-[var(--surface-sunken)] sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="min-w-0">
                    <span className="block text-xs capitalize text-[var(--text-secondary)]">
                      {label(connected.type)}
                    </span>
                    <span className="break-all text-sm font-medium">
                      {connected.reference}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs">
                    {connected.state ? (
                      <StatusBadge variant={statusVariant(connected.state)}>
                        {label(connected.state)}
                      </StatusBadge>
                    ) : null}
                    <span className="text-[var(--accent)]">Open →</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <PanelCard
            variant="appInset"
            className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
          >
            No connected records were found in this merchant’s synchronized
            sources.
          </PanelCard>
        )}
      </section>
    </main>
  );
}
