"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { auditActionLabel, auditResourceSummary } from "@/lib/audit/actionLabels";
import { claimEventSummary } from "@/lib/claims/events";
import { useFetchJson } from "@/lib/react/useFetchJson";
import { formatDateTimeInTimeZone, formatNumber, formatTimeInTimeZone } from "@/lib/utils/format";
import { buildActorActionSummary } from "@/lib/capabilities/derived";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
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

type ActorInfo = { email: string; role: string };
type ActorActionSummary = { actorUserId: string | null; action: string; count: number; financialRecordAction: boolean; movedMoney: false };
type Props = { actorsByUserId: Record<string, ActorInfo> };

const card: CSSProperties = {
  background: "#fff",
  borderRadius: 10,
  boxShadow: "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)",
};
const control: CSSProperties = {
  height: 29,
  appearance: "none",
  border: 0,
  borderRadius: 9,
  padding: "0 27px 0 10px",
  boxShadow: "inset 0 0 0 1px rgba(28,27,25,.11)",
  background: "#fff",
  color: "#40454a",
  font: "400 12.5px/1 'Inter',sans-serif",
};

function detailLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function detailValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(detailValue).join(", ");
  if (value && typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${detailLabel(key)}: ${detailValue(item)}`).join(" · ");
  return String(value);
}

function rowSummary(row: AuditRow): string {
  if (row.resource_type === "claim") {
    return claimEventSummary({
      event_type: row.action,
      previous_status: typeof row.metadata?.previous_status === "string" ? row.metadata.previous_status : null,
      new_status: typeof row.metadata?.new_status === "string" ? row.metadata.new_status : null,
      previous_decision: typeof row.metadata?.previous_decision === "string" ? row.metadata.previous_decision : null,
      new_decision: typeof row.metadata?.new_decision === "string" ? row.metadata.new_decision : null,
      previous_outcome: typeof row.metadata?.previous_outcome === "string" ? row.metadata.previous_outcome : null,
      new_outcome: typeof row.metadata?.new_outcome === "string" ? row.metadata.new_outcome : null,
      note: typeof row.metadata?.note === "string" ? row.metadata.note : null,
    });
  }
  const retained = Object.entries(row.metadata ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== "").slice(0, 3);
  return retained.length ? retained.map(([key, value]) => `${key.replace(/_/g, " ")}: ${detailValue(value)}`).join(" · ") : "Action recorded";
}

function actionTag(row: AuditRow) {
  const value = `${row.action} ${row.resource_type ?? ""}`.toLowerCase();
  if (/refund|credit|write.?off|reconcil|recover/.test(value)) return { label: "MONEY RECORD", tone: "#b0431a", background: "#fdf0e6" };
  if (/rule/.test(value)) return { label: "RULE CHANGE", tone: "#7a5310", background: "#fff3e9" };
  if (/flow/.test(value)) return { label: "FLOW", tone: "#40454a", background: "#f4f3f1" };
  if (/import|processing/.test(value)) return { label: "IMPORT", tone: "#7a5310", background: "#fff3e9" };
  if (/export/.test(value)) return { label: "EXPORT", tone: "#40454a", background: "#f4f3f1" };
  return { label: "EVENT", tone: "#40454a", background: "#f4f3f1" };
}


function initials(label: string, automated: boolean) {
  if (automated) return "··";
  const parts = label.split(/[\s@._-]+/).filter(Boolean);
  return `${parts[0]?.[0] ?? "?"}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase();
}

export default function AuditTrailClient({ actorsByUserId }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerEvent, setDrawerEvent] = useState<AuditRow | null>(null);
  const range = ["1", "7", "30", "all"].includes(searchParams.get("range") ?? "") ? searchParams.get("range")! : "30";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const rangeLabel = range === "all" ? "all time" : range === "1" ? "last 24 hours" : `last ${range} days`;
  const period = useMemo(() => ({ end: new Date().toISOString(), start: range === "all" ? null : new Date(Date.now() - Number(range) * 86_400_000).toISOString() }), [range]);
  const requestedActor = searchParams.get("actor") ?? "";
  const requestedAction = searchParams.get("action") ?? "";
  const search = (searchParams.get("search") ?? "").trim().toLowerCase();
  const auditUrl = useMemo(() => {
    const params = new URLSearchParams({ limit: "200", page: String(page), endDate: period.end });
    if (period.start) params.set("startDate", period.start);
    if (requestedActor) params.set("actorUserId", requestedActor);
    if (requestedAction) params.set("action", requestedAction);
    return `/api/audit-trail?${params}`;
  }, [page, period, requestedActor, requestedAction]);
  const { data, loading, error } = useFetchJson<{ rows?: AuditRow[]; total?: number | null; pages?: number | null; actorSummary?: ActorActionSummary[]; actorSummaryState?: "available" | "partial" | "unavailable" }>(auditUrl, {
    parse: async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Failed to load audit trail");
      return body;
    },
  });
  const rows = useMemo(() => loading || error ? [] : data?.rows ?? [], [data?.rows, loading, error]);

  function actorLabel(row: AuditRow) {
    if (!row.actor_user_id) return "Actor not recorded";
    return actorsByUserId[row.actor_user_id]?.email || `Identity unavailable · ${hashId(row.actor_user_id)}`;
  }

  function actorRole(row: AuditRow) {
    if (!row.actor_user_id) return "Role unavailable";
    return row.actor_role ?? "Role not retained";
  }

  const actorOptions = useMemo(() => Array.from(new Set([...Object.keys(actorsByUserId), ...rows.flatMap(row => row.actor_user_id ? [row.actor_user_id] : []), ...(requestedActor ? [requestedActor] : [])])).sort(), [rows, actorsByUserId, requestedActor]);
  const actionOptions = useMemo(() => Array.from(new Set([...rows.map((row) => row.action), ...(requestedAction ? [requestedAction] : [])])).sort(), [rows, requestedAction]);
  const actor = requestedActor;
  const action = requestedAction;
  const filteredRows = rows.filter((row) => {
    if (actor && row.actor_user_id !== actor) return false;
    if (action && row.action !== action) return false;
    if (!search) return true;
    return [actorLabel(row), auditActionLabel(row.action, row.resource_type), auditResourceSummary(row.resource_type, row.resource_id), rowSummary(row)].join(" ").toLowerCase().includes(search);
  });
  const displayedRows = filteredRows;
  const successfulEmpty = !loading && !error && rows.length === 0;
  const automatedCount = filteredRows.filter((row) => !row.actor_user_id).length;
  const financialRecordCount = buildActorActionSummary(filteredRows).filter((item) => item.financialRecordAction).reduce((sum, item) => sum + item.count, 0);

  const hourlyCounts = (() => {
    const values = Array.from({ length: 24 }, () => 0);
    for (const row of filteredRows) {
      const date = new Date(row.created_at);
      if (Number.isNaN(date.getTime())) continue;
      const hour = Number(formatTimeInTimeZone(date, "Europe/London").split(":")[0]);
      if (hour >= 0 && hour < 24) values[hour] += 1;
    }
    return values;
  })();

  const actorBreakdown = (() => {
    const totals = new Map<string, { count: number; financial: number; system: boolean }>();
    for (const item of buildActorActionSummary(filteredRows)) {
      const label = item.actorUserId ? (actorsByUserId[item.actorUserId]?.email || `Identity unavailable · ${hashId(item.actorUserId)}`) : "Actor not recorded";
      const current = totals.get(label) ?? { count: 0, financial: 0, system: !item.actorUserId };
      current.count += item.count;
      if (item.financialRecordAction) current.financial += item.count;
      totals.set(label, current);
    }
    return [...totals.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  })();

  const actionBreakdown = (() => {
    const totals = new Map<string, number>();
    for (const row of filteredRows) totals.set(row.action, (totals.get(row.action) ?? 0) + 1);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();

  function updateFilter(key: "actor" | "action" | "range" | "page", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (key !== "page") next.delete("page");
    if (value) next.set(key, value); else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  const exportHref = `${auditUrl}&format=csv`;

  const maxHour = Math.max(1, ...hourlyCounts);
  const totalLabel = loading || error ? "—" : formatNumber(filteredRows.length);

  return (
    <>
      <h1 data-reference-ignore="accessibility-heading" className="sr-only">Audit trail</h1>
      <div style={{ minHeight: 54, flexWrap: "wrap", paddingBlock: 8, flex: 'none', display: "flex", alignItems: "center", gap: 14, padding: "0 22px", borderBottom: "1px solid #eae8e5" }}>
        <Metric value={totalLabel} label="matching entries on this page" />
        <Divider />
        <Metric value={loading || error ? "—" : formatNumber(financialRecordCount)} label="financial events on this page" tone="#b0431a" />
        <Divider />
        <Metric value={loading || error ? "—" : formatNumber(automatedCount)} label="actor not recorded" />
        <span style={{ flex: 1 }} />
        <select aria-label="Audit period" value={range} onChange={event => updateFilter("range", event.target.value)} style={control}><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option></select>
        <label className="sr-only" htmlFor="audit-actor-filter">Filter audit entries by actor</label>
        <select id="audit-actor-filter" aria-label="Filter by actor" value={actor} onChange={(event) => updateFilter("actor", event.target.value)} style={control}><option value="">All actors</option>{actorOptions.map((value) => <option key={value} value={value}>{actorsByUserId[value]?.email || `Identity unavailable · ${hashId(value)}`}</option>)}</select>
        <label className="sr-only" htmlFor="audit-action-filter">Filter audit entries by action</label>
        <select id="audit-action-filter" aria-label="Filter by action" value={action} onChange={(event) => updateFilter("action", event.target.value)} style={control}><option value="">All actions</option>{actionOptions.map((value) => <option key={value} value={value}>{auditActionLabel(value, null)}</option>)}</select>
        <a aria-disabled={Boolean(search)} href={search ? undefined : exportHref} title={search ? "Clear text search to export the server-filtered page." : undefined} style={{ ...control, height: "auto", padding: "6px 11px", background: "#1c1f23", color: "#fff", boxShadow: "none", textDecoration: "none", fontWeight: 500 }}>Export this page</a>
      </div>

      <div data-screen-label="Audit log" data-visual-world="supplied-package" data-surface-id="audit-trail" data-archetype="P10" style={{ flex: 1, minHeight: 0, padding: "16px 22px 20px", display: "flex", flexWrap: "wrap", overflowY: "auto", gap: 14 }}>
        <div style={{ flex: "1 1 540px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <section aria-label="Activity by hour on the filtered page" style={{ ...card, padding: "13px 16px 11px", flex: "none" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 11 }}><span style={{ font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>ACTIVITY BY HOUR · FILTERED PAGE · {rangeLabel.toUpperCase()}</span><span style={{ flex: 1 }} /><span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: "#ff7a30" }} /><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: "#64686d" }}>03:00</span></span><span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: "#1c1f23" }} /><span style={{ font: "400 10px/1 'IBM Plex Mono',monospace", color: "#64686d" }}>desk hours</span></span></div>
            <div style={{ height: 80, display: "flex", alignItems: "flex-end", gap: 3 }}>{hourlyCounts.map((count, hour) => <div key={hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }} title={`${String(hour).padStart(2, "0")}:00 · ${count} matching entries on this page · ${rangeLabel}`}><div style={{ width: "100%", height: Math.max(2, Math.round((count / maxHour) * 64)), borderRadius: "2px 2px 0 0", background: hour === 3 ? "#ff7a30" : hour >= 8 && hour <= 17 ? "#1c1f23" : "#d9d4cd" }} /><span style={{ height: 8, font: "400 8.5px/1 'IBM Plex Mono',monospace", color: "#64686d" }}>{hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}</span></div>)}</div>
          </section>

          <section id="audit-event-history" style={{ ...card, padding: "12px 16px 12px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div role="table" aria-label="Audit trail events" tabIndex={0} style={{ flex: 1, minHeight: 180, overflow: "auto" }}>
              <div role="row" style={{ display: "grid", gridTemplateColumns: "140px 140px minmax(180px,1fr) 88px 110px", minWidth: 702, gap: 11, paddingBottom: 8, color: "#64686d", fontSize: 10 }}>{["TIME · LONDON", "ACTOR", "EVENT · NEWEST FIRST", "RECORDED ROLE", "TYPE"].map(label => <span key={label} role="columnheader">{label}</span>)}</div>
              {error ? <p role="alert" data-state-id="audit-trail-error" style={{ margin: 0, padding: "18px 0", color: "#b0431a", font: "400 12px/1.5 'Inter',sans-serif" }}>{error}</p> : displayedRows.map((row) => <AuditEventRow key={row.id} row={row} actor={actorLabel(row)} role={actorRole(row)} onOpen={() => setDrawerEvent(row)} />)}
              {!loading && !error && !displayedRows.length ? <p data-state-id={successfulEmpty ? "audit-trail-empty" : undefined} style={{ margin: 0, padding: "18px 0", color: "#64686d", font: "400 12px/1.5 'Inter',sans-serif" }}>{rows.length ? "No events match these filters." : "No audit events recorded yet."}</p> : null}
            </div>
            <div style={{ borderTop: "1px solid #e4e3e0", marginTop: 8, paddingTop: 10, display: "flex", alignItems: "center", gap: 10 }}><span style={{ flex: 1, color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>Events may record a request, attempt, failure or completion. Read the event and its retained outcome; an entry alone does not prove completion.</span><span style={{ color: "#64686d", font: "400 11px/1.5 'IBM Plex Mono',monospace" }}>page {page} · {data?.total == null ? "total unavailable" : `${formatNumber(data.total)} events in server scope`}</span></div>
          </section>
          <nav aria-label="Audit pages" style={{ display: 'flex', gap: 12 }}><button type="button" disabled={page <= 1 || loading} onClick={() => updateFilter("page", String(page - 1))}>Previous page</button><button type="button" disabled={loading || data?.pages == null || page >= data.pages || page >= 5} onClick={() => updateFilter("page", String(page + 1))}>Next page</button><span>{(data?.total ?? 0) > 1000 ? "First 1,000 events accessible; narrow the period for older events. " : ""}{rangeLabel} · Europe/London · as of {formatDateTimeInTimeZone(period.end, "Europe/London")}</span></nav>
          <details><summary>Activity table alternative</summary><table><caption>Filtered page activity by hour · Europe/London</caption><thead><tr><th>Hour</th><th>Events</th></tr></thead><tbody>{hourlyCounts.map((count, hour) => <tr key={hour}><th>{hour}:00</th><td>{loading || error ? 'Unavailable' : count}</td></tr>)}</tbody></table></details>
          <div className="sr-only" aria-label="Audit trail summary">No pilot period published. History is append-only inside the workspace.</div>
        </div>

        <aside style={{ width: 300, flex: "1 1 260px", background: "#f4f3f1", borderRadius: 13, padding: "12px 13px", display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ flex: 1, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>WHO ACTED · FILTERED PAGE</span><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", color: "#64686d" }}>events · financial records</span></div>
          <section style={{ ...card, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 9 }}>
            {loading || error || !actorBreakdown.length ? <p data-state-id="audit-actor-breakdown-unavailable" style={{ margin: 0, color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>{loading ? "Loading actor summary…" : error ? "Actor summary unavailable." : "No actors in this filtered page."}</p> : actorBreakdown.map(([label, totals]) => <div key={label}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", background: "#f2f0ed", boxShadow: "inset 0 0 0 1px rgba(28,27,25,.06)", textAlign: "center", color: "#40454a", font: "500 8.5px/20px 'IBM Plex Mono',monospace" }}>{initials(label, totals.system)}</div><span title={label} style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#40454a", font: "400 11.5px/1 'Inter',sans-serif" }}>{label}</span><span style={{ width: 30, textAlign: "right", color: "#64686d", font: "400 10.5px/1 'IBM Plex Mono',monospace" }}>{totals.count}</span></div><div style={{ display: "flex", gap: 9, padding: "5px 0 1px 29px", color: "#64686d", font: "400 9.5px/1.4 'IBM Plex Mono',monospace" }}>{totals.financial} financial records</div></div>)}
            {data?.actorSummaryState === "partial" ? <p style={{ margin: 0, color: "#7a5310", font: "400 10.5px/1.4 'Inter',sans-serif" }}>Some audit sources did not answer; this summary is partial.</p> : null}
          </section>
          <div style={{ paddingTop: 2, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>BY ACTION</div>
          <section style={{ ...card, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 8 }}>{actionBreakdown.length ? actionBreakdown.map(([name, count]) => <div key={name} style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ flex: 1, color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>{auditActionLabel(name, null)}</span><span style={{ color: "#1c1f23", font: "400 11.5px/1.5 'IBM Plex Mono',monospace" }}>{count}</span></div>) : <span style={{ color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>Unavailable</span>}</section>
          <div style={{ paddingTop: 2, font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: ".09em", color: "#64686d" }}>WHAT THIS LOG GUARANTEES</div>
          <section style={{ ...card, padding: "12px 13px", display: "flex", flexDirection: "column", gap: 8 }}><div style={{ color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>Operational corrections append new entries. Workspace deletion is a separate irreversible owner action.</div><div style={{ borderTop: "1px solid #f4f2ef", paddingTop: 8, color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>Retention period unavailable — no approved pilot retention period has been published.</div></section>
          <span style={{ flex: 1 }} />
          <div style={{ borderTop: "1px solid #e4e3e0", paddingTop: 10, color: "#64686d", font: "400 11px/1.5 'Inter',sans-serif" }}>Who may see this log is set in <Link href="/settings/workspace/team" style={{ color: "#9b470d", textDecoration: "none" }}>team and permissions</Link>.</div>
        </aside>
      </div>

      {drawerEvent ? <EventDrawer row={drawerEvent} actor={actorLabel(drawerEvent)} role={actorRole(drawerEvent)} onClose={() => setDrawerEvent(null)} /> : null}
    </>
  );
}

function Metric({ value, label, tone = "#40454a" }: { value: string; label: string; tone?: string }) {
  return <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ color: tone, font: "400 17px/1 'IBM Plex Mono',monospace" }}>{value}</span><span style={{ color: "#64686d", font: "400 11.5px/1 'Inter',sans-serif" }}>{label}</span></div>;
}

function Divider() { return <div style={{ width: 1, height: 22, background: "#eae8e5" }} />; }

function AuditEventRow({ row, actor, role, onOpen }: { row: AuditRow; actor: string; role: string; onOpen: () => void }) {
  const tag = actionTag(row);
  return <div role="row" style={{ display: "grid", gridTemplateColumns: "140px 140px minmax(180px,1fr) 88px 110px", minWidth: 702, gap: 11, padding: "9px 0", borderTop: "1px solid #f4f2ef", alignItems: "center", font: "400 11.5px/1.5 'Inter',sans-serif", overflowWrap: "anywhere" }}>
    <span role="cell">{formatDateTimeInTimeZone(row.created_at, "Europe/London")}</span>
    <span role="cell">{actor}</span>
    <span role="cell"><button type="button" onClick={onOpen} aria-label={`Open event: ${auditActionLabel(row.action, row.resource_type)}`} style={{ border: 0, padding: 0, background: "transparent", color: "#1c1f23", textAlign: "left", font: "inherit", cursor: "pointer", overflowWrap: "anywhere" }}>{auditActionLabel(row.action, row.resource_type)} · <span style={{ color: "#9b470d" }}>{auditResourceSummary(row.resource_type, row.resource_id)}</span></button></span>
    <span role="cell">{role}</span><span role="cell" style={{ color: tag.tone, background: tag.background, borderRadius: 5, padding: "2px 7px", fontSize: 9.5 }}>{tag.label}</span>
  </div>;
}

function EventDrawer({ row, actor, role, onClose }: { row: AuditRow; actor: string; role: string; onClose: () => void }) {
  const overlay = useOverlayPresence({ open: true, onClose, trapFocus: true, lockBodyScroll: true });
  return <OverlayPortal><div data-overlay-id="audit-event-detail-drawer" style={{ position: "fixed", inset: 0, zIndex: 120, pointerEvents: "auto", display: "flex", justifyContent: "flex-end", background: "rgba(28,27,25,.26)" }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside ref={overlay.containerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Selected event" style={{ width: "min(520px,100vw)", height: "100%", overflowY: "auto", background: "#fff", boxShadow: "-16px 0 50px rgba(28,27,25,.14)" }}><header style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid #eae8e5" }}><div style={{ flex: 1 }}><div style={{ color: "#64686d", font: "400 10px/1 'IBM Plex Mono',monospace" }}>EVT-{hashId(row.id).slice(1)}</div><h2 style={{ margin: "5px 0 0", font: "500 16px/1.3 'Inter',sans-serif" }}>{auditActionLabel(row.action, row.resource_type)}</h2></div><button type="button" aria-label="Close selected event" onClick={onClose} style={{ width: 28, height: 28, border: 0, borderRadius: 8, background: "#f4f3f1", color: "#64686d", cursor: "pointer" }}><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2.2 2.2 9.8 9.8M9.8 2.2 2.2 9.8" /></svg></button></header><div style={{ padding: 18 }}><p style={{ margin: "0 0 16px", color: "#40454a", font: "400 12.5px/1.55 'Inter',sans-serif" }}>{rowSummary(row)}</p><dl style={{ display: "grid", gridTemplateColumns: "132px minmax(0,1fr)", gap: "9px 14px", margin: 0 }}>{[["When", formatDateTimeInTimeZone(row.created_at, "Europe/London")], ["Actor", `${actor} · ${role}`], ["Permission used", typeof row.metadata?.permission === "string" ? row.metadata.permission : "— Not retained"], ["Object", auditResourceSummary(row.resource_type, row.resource_id)]].map(([label, value]) => <div key={label} style={{ display: "contents" }}><dt style={{ color: "#64686d", font: "400 11px/1.5 'Inter',sans-serif" }}>{label}</dt><dd style={{ margin: 0, color: "#1c1f23", font: "400 11px/1.5 'IBM Plex Mono',monospace", overflowWrap: "anywhere" }}>{value}</dd></div>)}{Object.entries(row.metadata ?? {}).slice(0, 8).map(([key, value]) => <div key={key} style={{ display: "contents" }}><dt style={{ color: "#64686d", font: "400 11px/1.5 'Inter',sans-serif" }}>{detailLabel(key)}</dt><dd style={{ margin: 0, color: "#1c1f23", font: "400 11px/1.5 'IBM Plex Mono',monospace", overflowWrap: "anywhere" }}>{detailValue(value)}</dd></div>)}</dl><p style={{ margin: "18px 0 0", paddingTop: 12, borderTop: "1px solid #e4e3e0", color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>This event remains exactly as recorded. Any later reversal or correction appends a new event.</p>{row.resource_href ? <Link href={row.resource_href} style={{ display: "inline-block", marginTop: 12, padding: "6px 10px", borderRadius: 9, boxShadow: "inset 0 0 0 1px rgba(28,27,25,.11)", color: "#40454a", textDecoration: "none", font: "400 12.5px/1 'Inter',sans-serif" }}>Open related record</Link> : null}</div></aside></div></OverlayPortal>;
}
