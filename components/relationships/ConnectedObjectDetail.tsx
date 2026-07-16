import Link from "next/link";
import {
  Clock3 as Timeline,
  ExternalLink,
  FileCheck2,
  Link2,
} from "lucide-react";
import type {
  ObjectFact,
  ObjectSummary,
} from "@/lib/relationships/objectSummary";
import { Card } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrencyNullable, formatDateTime, formatNumber } from "@/lib/utils/format";
import { humanise } from "@/lib/ui/labels";

function label(value: string) {
  return humanise(value);
}
const OBJECT_ROUTES = {
  order: "/orders",
  ticket: "/tickets",
  shipment: "/shipments",
  refund: "/refunds",
  return: "/returns",
  dispute: "/disputes",
} as const;
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
  return humanise(String(item.value ?? "Unavailable"));
}

export function ConnectedObjectDetail({
  object,
  returnTo,
}: {
  object: ObjectSummary;
  returnTo?: string;
}) {
  const sourceUpdatedAt = object.provenance?.lastSyncedAt ?? object.updatedAt;
  return (
    <div
      className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6"
      data-testid="connected-object-detail"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {returnTo?.startsWith("/") ? (
          <Link
            href={returnTo}
            className="text-sm font-semibold text-[var(--accent)]"
          >
            Return to previous task
          </Link>
        ) : (
          <Link
            href={OBJECT_ROUTES[object.type]}
            className="text-sm font-semibold text-[var(--accent)]"
          >
            {label(object.type)}s
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
          {label(object.type)} record
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="break-all text-2xl font-semibold text-[var(--text-primary)]">
            {object.reference}
          </h1>
          <StatusBadge family="workflowStatus" value={object.state ?? "unknown"} />
        </div>
      </header>
      <section aria-labelledby="object-facts-heading">
        <h2 id="object-facts-heading" className="text-base font-semibold">
          {label(object.type)} facts
        </h2>
        {object.facts.length ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {object.facts.map((item) => (
              <Card unstyled key={item.label} variant="inset" className="p-3">
                <dt className="text-xs text-[var(--text-tertiary)]">
                  {item.label}
                </dt>
                <dd className="mt-1 break-words text-sm font-medium text-[var(--text-primary)]">
                  {factValue(item)}
                </dd>
              </Card>
            ))}
          </dl>
        ) : (
          <Card unstyled
            variant="inset"
            className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
          >
            This source supplied no additional typed facts.
          </Card>
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
                <Card unstyled
                  key={`${item.label}-${item.at ?? 'unknown'}-${item.detail ?? ''}`}
                  as="li"
                  variant="flat"
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
                </Card>
              ))}
            </ol>
          ) : (
            <Card unstyled
              variant="inset"
              className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
            >
              No source lifecycle timestamps are available.
            </Card>
          )}
        </section>
        <section aria-labelledby="object-provenance-heading">
          <h2 id="object-provenance-heading" className="text-base font-semibold">
            Data source
          </h2>
          <p className="mt-3 rounded-lg border border-[var(--border-muted)] bg-[var(--surface-sunken)] p-4 text-sm text-[var(--text-secondary)]">
            From {label(object.provenance?.sourceSystem ?? object.provider ?? "imported data")}
            {sourceUpdatedAt
              ? ` · updated ${formatDateTime(sourceUpdatedAt)}`
              : " · update time unavailable"}
          </p>
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
              <Card unstyled key={item.id} variant="flat" className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm">{item.title}</strong>
                  <StatusBadge family="confidence" value={item.confidence} size="sm" />
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
              </Card>
            ))}
          </div>
        ) : (
          <Card unstyled
            variant="inset"
            className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
          >
            No evidence linked yet.
          </Card>
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
                      <StatusBadge family="workflowStatus" value={connected.state} size="sm" />
                    ) : null}
                    <span className="text-[var(--accent)]">Open</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card unstyled
            variant="inset"
            className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
          >
            No connected records were found in this merchant’s synchronized
            sources.
          </Card>
        )}
      </section>
    </div>
  );
}
