import Link from "next/link";
import {
  ExternalLink,
} from "lucide-react";
import type {
  ObjectFact,
  ObjectSummary,
} from "@/lib/relationships/objectSummary";
import { PanelCard } from "@/components/ui";
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
            className="inline-flex h-7 items-center gap-1.5 rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[11px] font-semibold shadow-[var(--shadow-xs)] hover:bg-[var(--surface-hover)]"
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
                <dd className="mt-2 break-words text-xs font-semibold text-[var(--text-primary)]">{factValue(item)}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <PanelCard
            variant="appInset"
            className="p-4 text-xs text-[var(--text-secondary)]"
          >
            This source supplied no additional typed facts.
          </PanelCard>
        )}
        <div className={pageStyles.workbenchGrid}>
          <AuthenticatedPanel title="Lifecycle" capabilityId="object.lifecycle">
          {object.timeline.length ? (
            <ol className="relative divide-y divide-[var(--border-muted)] before:absolute before:bottom-5 before:left-[21px] before:top-5 before:w-px before:bg-[var(--border)]">
              {object.timeline.map((item) => (
                <li
                  key={`${item.label}-${item.at ?? 'unknown'}-${item.detail ?? ''}`}
                  className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2.5 px-3 py-3"
                >
                  <span className="z-10 mt-1 h-2 w-2 justify-self-center rounded-full bg-[var(--accent)] ring-[3px] ring-[var(--surface)]" />
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-[11px]">{item.label}</strong>
                      <time
                        className="font-mono text-[10px] text-[var(--text-tertiary)]"
                        dateTime={item.at ?? undefined}
                      >
                        {item.at ? formatDateTime(item.at) : "Time unavailable"}
                      </time>
                    </div>
                    {item.detail ? (
                      <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                        {label(item.detail)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <PanelCard
              variant="appInset"
              className="m-3 p-4 text-xs text-[var(--text-secondary)]"
            >
              No source lifecycle timestamps are available.
            </PanelCard>
          )}
          </AuthenticatedPanel>
          <AuthenticatedPanel title="Data source" capabilityId="object.provenance">
          <p className="p-4 text-[11px] leading-5 text-[var(--text-secondary)]">
            From {label(object.provenance?.sourceSystem ?? object.provider ?? "imported data")}
            {sourceUpdatedAt
              ? ` · updated ${formatDateTime(sourceUpdatedAt)}`
              : " · update time unavailable"}
          </p>
          </AuthenticatedPanel>
        </div>
      <AuthenticatedPanel title="Evidence used by payout cases" capabilityId="object.evidence">
        {object.evidence.length ? (
          <div className="grid divide-y divide-[var(--border-muted)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {object.evidence.map((item) => (
              <div key={item.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-[11px]">{item.title}</strong>
                  <StatusBadge family="confidence" value={item.confidence} size="sm" />
                </div>
                <p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">
                  {item.summary}
                </p>
                <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">
                  {label(item.provider)} · {label(item.type)}
                  {item.occurredAt ? ` · ${formatDateTime(item.occurredAt)}` : ""}
                </p>
                {item.reference ? (
                  <p className="mt-1 break-all font-mono text-[10px] text-[var(--text-tertiary)]">
                    {item.reference}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <PanelCard
            variant="appInset"
            className="m-3 p-4 text-xs text-[var(--text-secondary)]"
          >
            No evidence linked yet.
          </PanelCard>
        )}
      </AuthenticatedPanel>
      <AuthenticatedPanel title="Connected records" capabilityId="object.connected-records">
        {object.connected.length ? (
          <ul className="divide-y divide-[var(--border-muted)]">
            {object.connected.map((connected) => (
              <li key={`${connected.type}:${connected.id}`}>
                <Link
                  href={`${connected.href}?return=${encodeURIComponent(`/${object.type}s/${object.id}`)}`}
                  className="flex min-h-12 flex-col items-start justify-between gap-2 px-4 py-2.5 hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] capitalize text-[var(--text-secondary)]">
                      {label(connected.type)}
                    </span>
                    <span className="break-all text-[11px] font-semibold">
                      {connected.reference}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[10px]">
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
          <PanelCard
            variant="appInset"
            className="m-3 p-4 text-xs text-[var(--text-secondary)]"
          >
            No connected records were found in this merchant’s synchronized
            sources.
          </PanelCard>
        )}
      </AuthenticatedPanel>
        </div>
      </div>
    </div>
  );
}
