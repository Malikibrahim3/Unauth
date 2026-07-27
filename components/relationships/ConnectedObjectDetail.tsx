import Link from "next/link";
import {
  ExternalLink,
} from "lucide-react";
import type {
  ObjectFact,
  ObjectSummary,
} from "@/lib/relationships/objectSummary";
import { Panel } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrencyNullable, formatDateTime, formatNumber } from "@/lib/utils/format";
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import { AuthenticatedPanel } from "@/components/authenticated/AuthenticatedPanel";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";

function label(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
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
  return String(item.value ?? "Unavailable").replaceAll("_", " ");
}

export function ConnectedObjectDetail({
  object,
  returnTo,
}: {
  object: ObjectSummary;
  returnTo?: string;
}) {
  const sourceUpdatedAt = object.provenance?.lastSyncedAt ?? object.updatedAt;
  const backHref = returnTo?.startsWith("/") ? returnTo : OBJECT_ROUTES[object.type];
  const backLabel = returnTo?.startsWith("/") ? "Previous task" : `${label(object.type)}s`;
  return (
    <div
      data-testid="connected-object-detail"
    >
      <AuthenticatedPageHeader
        eyebrow={`${label(object.type)} record`}
        title={object.reference}
        breadcrumbs={[{ label: backLabel, href: backHref }, { label: object.reference }]}
        actions={<>
          <StatusBadge family="workflowStatus" value={object.state ?? "unknown"} />
          {object.provenance?.sourceUrl ? (
          <a
            href={object.provenance.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-7 items-center gap-1.5 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2.5 text-[length:var(--ua-text-micro-size)] font-semibold hover:bg-[var(--ua-surface-hover)]"
          >
            Open in {label(object.provenance.sourceSystem)}{" "}
            <ExternalLink className="h-3 w-3" />
          </a>
          ) : null}
        </>}
      />
      <div className={pageStyles.pageBody}>
        <div className={pageStyles.workbenchStack}>
        {object.facts.length ? (
          <dl className={`${pageStyles.kpiStrip} grid-cols-2 lg:grid-cols-4`} aria-label={`${label(object.type)} facts`}>
            {object.facts.map((item) => (
              <div key={item.label} className={pageStyles.kpiItem}>
                <dt className={pageStyles.kpiLabel}>{item.label}</dt>
                <dd className="mt-2 break-words text-xs font-semibold text-[var(--ua-text-primary)]">{factValue(item)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <Panel
            variant="inset"
            className="p-4 text-xs text-[var(--ua-text-secondary)]"
          >
            This source supplied no additional typed facts.
          </Panel>
        )}
        <div className={pageStyles.workbenchGrid}>
          <AuthenticatedPanel title="Lifecycle" capabilityId="object.lifecycle">
          {object.timeline.length ? (
            <ol className="relative divide-y divide-[var(--ua-border-subtle)] before:absolute before:bottom-5 before:left-[21px] before:top-5 before:w-px before:bg-[var(--ua-border-default)]">
              {object.timeline.map((item) => (
                <li
                  key={`${item.label}-${item.at ?? 'unknown'}-${item.detail ?? ''}`}
                  className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2.5 px-3 py-3"
                >
                  <span className="z-10 mt-1 h-2 w-2 justify-self-center rounded-full bg-[var(--ua-action-primary)] ring-2 ring-[var(--ua-surface-primary)]" />
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-[length:var(--ua-text-micro-size)]">{item.label}</strong>
                      <time
                        className="font-mono text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]"
                        dateTime={item.at ?? undefined}
                      >
                        {item.at ? formatDateTime(item.at) : "Time unavailable"}
                      </time>
                    </div>
                    {item.detail ? (
                      <p className="mt-1 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-secondary)]">
                        {label(item.detail)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Panel
              variant="inset"
              className="m-3 p-4 text-xs text-[var(--ua-text-secondary)]"
            >
              No source lifecycle timestamps are available.
            </Panel>
          )}
          </AuthenticatedPanel>
          <AuthenticatedPanel title="Data source" capabilityId="object.provenance">
          <p className="p-4 text-[length:var(--ua-text-micro-size)] leading-5 text-[var(--ua-text-secondary)]">
            From {label(object.provenance?.sourceSystem ?? object.provider ?? "imported data")}
            {sourceUpdatedAt
              ? ` · updated ${formatDateTime(sourceUpdatedAt)}`
              : " · update time unavailable"}
          </p>
          </AuthenticatedPanel>
        </div>
      <AuthenticatedPanel title="Evidence used by cases" capabilityId="object.evidence">
        {object.evidence.length ? (
          <div className="grid divide-y divide-[var(--ua-border-subtle)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {object.evidence.map((item) => (
              <div key={item.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-[length:var(--ua-text-micro-size)]">{item.title}</strong>
                  <StatusBadge family="confidence" value={item.confidence} size="sm" />
                </div>
                <p className="mt-1 text-[length:var(--ua-text-micro-size)] leading-4 text-[var(--ua-text-secondary)]">
                  {item.summary}
                </p>
                <p className="mt-2 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
                  {label(item.provider)} · {label(item.type)}
                  {item.occurredAt ? ` · ${formatDateTime(item.occurredAt)}` : ""}
                </p>
                {item.reference ? (
                  <p className="mt-1 break-all font-mono text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
                    {item.reference}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Panel
            variant="inset"
            className="m-3 p-4 text-xs text-[var(--ua-text-secondary)]"
          >
            No evidence linked yet.
          </Panel>
        )}
      </AuthenticatedPanel>
      <AuthenticatedPanel title="Connected records" capabilityId="object.connected-records">
        {object.connected.length ? (
          <ul className="divide-y divide-[var(--ua-border-subtle)]">
            {object.connected.map((connected) => (
              <li key={`${connected.type}:${connected.id}`}>
                <div className="flex min-h-12 items-center gap-3 px-4 py-2.5 hover:bg-[var(--ua-surface-hover)]">
                  <Link
                    href={`${connected.href}?return=${encodeURIComponent(`/${object.type}s/${object.id}`)}`}
                    className="flex min-w-0 flex-1 flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="min-w-0">
                      <span className="block text-[length:var(--ua-text-micro-size)] capitalize text-[var(--ua-text-secondary)]">
                        {label(connected.type)}
                      </span>
                      <span className="break-all text-[length:var(--ua-text-micro-size)] font-semibold">
                        {connected.reference}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[length:var(--ua-text-micro-size)]">
                      {connected.state ? (
                        <StatusBadge family="workflowStatus" value={connected.state} size="sm" />
                      ) : null}
                      <span className="text-[var(--ua-action-primary)]">Open</span>
                    </span>
                  </Link>
                  {connected.externalHref ? (
                    <a
                      href={connected.externalHref}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${label(connected.type)} in ${label(connected.externalSource ?? "source")}`}
                      title={`Open in ${label(connected.externalSource ?? "source")}`}
                      className="shrink-0 rounded p-1 text-[var(--ua-action-primary)] hover:bg-[var(--ua-surface-primary)]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Panel
            variant="inset"
            className="m-3 p-4 text-xs text-[var(--ua-text-secondary)]"
          >
            No connected records were found in this merchant’s synchronized
            sources.
          </Panel>
        )}
      </AuthenticatedPanel>
        </div>
      </div>
    </div>
  );
}
