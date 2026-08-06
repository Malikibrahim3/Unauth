"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Download, Filter } from "lucide-react";
import { claimEventSummary } from "@/lib/claims/events";
import {
  auditActionLabel,
  auditResourceSummary,
} from "@/lib/audit/actionLabels";
import { DataTable, RegistrySurface, Select } from "@/components/ui";
import { useFetchJson } from "@/lib/react/useFetchJson";
import { formatDateTime } from "@/lib/utils/format";
import { hashId } from "@/lib/ui/displayRef";

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  actor_role?: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_href?: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ActorInfo = {
  email: string;
  role: string;
};

type AuditTrailClientProps = {
  actorsByUserId: Record<string, ActorInfo>;
};

const RESOURCE_FILTERS = [
  { value: "", label: "All resources" },
  { value: "claim", label: "Cases" },
  { value: "processing_job", label: "Audit runs" },
  { value: "customer", label: "Customers" },
  { value: "report", label: "Reports" },
];

function formatTimestamp(value: string) {
  return formatDateTime(value);
}

function rowSummary(row: AuditRow): string {
  if (row.resource_type === "claim") {
    return claimEventSummary({
      event_type: row.action,
      previous_status:
        typeof row.metadata?.previous_status === "string"
          ? row.metadata.previous_status
          : null,
      new_status:
        typeof row.metadata?.new_status === "string"
          ? row.metadata.new_status
          : null,
      previous_decision:
        typeof row.metadata?.previous_decision === "string"
          ? row.metadata.previous_decision
          : null,
      new_decision:
        typeof row.metadata?.new_decision === "string"
          ? row.metadata.new_decision
          : null,
      previous_outcome:
        typeof row.metadata?.previous_outcome === "string"
          ? row.metadata.previous_outcome
          : null,
      new_outcome:
        typeof row.metadata?.new_outcome === "string"
          ? row.metadata.new_outcome
          : null,
      note: typeof row.metadata?.note === "string" ? row.metadata.note : null,
    });
  }

  const meta = row.metadata ?? {};
  const parts = Object.entries(meta)
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    )
    .slice(0, 3)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${String(value)}`);
  return parts.length > 0 ? parts.join(" · ") : "Action recorded";
}

function metadataEntries(metadata: Record<string, unknown> | null) {
  if (!metadata) return [];
  return Object.entries(metadata).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
}

function detailLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function detailValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(detailValue).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${detailLabel(key)}: ${detailValue(item)}`)
      .join(" · ");
  }
  return String(value);
}

export default function AuditTrailClient({
  actorsByUserId,
}: AuditTrailClientProps) {
  const [resourceType, setResourceType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const auditUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "60" });
    if (resourceType) params.set("resourceType", resourceType);
    return `/api/audit-trail?${params.toString()}`;
  }, [resourceType]);

  const { data, loading, error } = useFetchJson<{ rows?: AuditRow[] }>(
    auditUrl,
    {
      parse: async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body?.error ?? "Failed to load audit trail");
        return body;
      },
    },
  );
  const rows = data?.rows ?? [];

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ format: "csv", limit: "200" });
    if (resourceType) params.set("resourceType", resourceType);
    return `/api/audit-trail?${params.toString()}`;
  }, [resourceType]);

  function actorLabel(row: AuditRow) {
    if (!row.actor_user_id) return "System";
    const actor = actorsByUserId[row.actor_user_id];
    if (actor) return `${actor.email} (${actor.role})`;
    const role = row.actor_role ?? "user";
    return `${hashId(row.actor_user_id)} (${role})`;
  }

  return (
    <RegistrySurface
      aria-label="Activity log"
      toolbar={<><div><h2 className="ua-text-working-title" style={{ color: "var(--ua-text-primary)" }}>Activity log</h2><p className="ua-text-caption-role mt-1" style={{ color: "var(--ua-text-secondary)" }}>Filterable record of case activity and sensitive account actions.</p></div><div className="flex flex-wrap items-center gap-2"><Filter className="h-4 w-4" style={{ color: "var(--ua-text-tertiary)" }} aria-hidden="true" /><label className="sr-only" htmlFor="audit-resource-filter">Filter by resource</label><Select id="audit-resource-filter" value={resourceType} onChange={(event) => setResourceType(event.target.value)} className="w-auto">{RESOURCE_FILTERS.map((option) => <option key={option.value || "all"} value={option.value}>{option.label}</option>)}</Select></div></>}
      resultCount={loading ? 'Loading activity…' : error ? 'Activity unavailable' : `${rows.length} recent events`}
      pagination={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a
            href={exportHref}
            className="ua-text-label inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{
              borderColor: "var(--ua-border-default)",
              color: "var(--ua-text-secondary)",
              outlineColor: "var(--ua-action-primary)",
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </div>
      }
    >
      {loading ? (
        <p className="ua-text-body p-5" style={{ color: "var(--ua-text-tertiary)" }}>
          Loading audit events…
        </p>
      ) : error ? (
        <p role="alert" className="ua-text-body p-5" style={{ color: "var(--ua-risk-critical)" }}>
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="ua-text-body p-5" style={{ color: "var(--ua-text-tertiary)" }}>
          No audit events recorded yet.
        </p>
      ) : (
        <DataTable
          aria-label="Audit trail events"
          rows={rows}
          emptyState={<p className="ua-text-body p-5 text-[var(--ua-text-tertiary)]">No audit events recorded yet.</p>}
          getRowKey={(row) => `${row.resource_type ?? "system"}-${row.id}`}
          density="metadata"
          flush
          columns={[
            {
              key: "expand",
              header: "Details",
              width: "44px",
              render: (row) => {
                const rowKey = `${row.resource_type ?? "system"}-${row.id}`;
                const isExpanded = expandedId === rowKey;
                const details = metadataEntries(row.metadata);
                return (
                  details.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--ua-surface-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                      style={{ outlineColor: "var(--ua-action-primary)" }}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "Hide metadata" : "Show metadata"}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  ) : null
                );
              },
            },
            {
              key: "time",
              header: "Time",
              render: (row) => <span className="ua-text-metadata whitespace-nowrap">{formatTimestamp(row.created_at)}</span>,
            },
            {
              key: "action",
              header: "Action",
              render: (row) => <span className="ua-text-working-title text-[var(--ua-text-primary)]">{auditActionLabel(row.action, row.resource_type)}</span>,
            },
            {
              key: "object",
              header: "Object",
              render: (row) => {
                const claimHref = row.resource_type === "claim" && row.resource_id
                  ? (row.resource_href ?? "/cases")
                  : null;
                return claimHref ? (
                  <Link
                    href={claimHref}
                    className="ua-text-label text-[var(--ua-action-primary)] hover:underline"
                    title={`Open case ${hashId(row.resource_id)}`}
                  >
                    {auditResourceSummary(row.resource_type, row.resource_id)}
                  </Link>
                ) : <span className="ua-text-dense text-[var(--ua-text-secondary)]">{auditResourceSummary(row.resource_type, row.resource_id)}</span>;
              },
            },
            {
              key: "actor",
              header: "Actor",
              render: (row) => <span className="ua-text-dense text-[var(--ua-text-secondary)]">{actorLabel(row)}</span>,
            },
            {
              key: "summary",
              header: "Summary",
              render: (row) => {
                const rowKey = `${row.resource_type ?? "system"}-${row.id}`;
                const details = metadataEntries(row.metadata);
                return (
                  <div className="ua-text-dense max-w-xs text-[var(--ua-text-secondary)]">
                    <span className="block truncate" title={rowSummary(row)}>{rowSummary(row)}</span>
                    {expandedId === rowKey && details.length > 0 ? (
                      <dl className="mt-2 grid gap-2 border-t border-[var(--ua-border-subtle)] pt-2 sm:grid-cols-2">
                        {details.map(([key, value]) => (
                          <div key={key}>
                            <dt className="ua-text-metadata">{detailLabel(key)}</dt>
                            <dd className="ua-text-dense mt-0.5 break-words text-[var(--ua-text-secondary)]">{detailValue(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                );
              },
            },
          ]}
        />
      )}
    </RegistrySurface>
  );
}
