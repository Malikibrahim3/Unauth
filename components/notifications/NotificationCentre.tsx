"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import type { DigestPreview } from "@/lib/notifications/digest";
import { NEEDS_NOTIFICATION_KINDS, type NotificationKind } from "@/lib/notifications/kinds";
import type { NotificationCounts, NotificationFilter } from "@/lib/notifications/store";
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  target_href: string;
  read_at: string | null;
  created_at: string;
};

const needsKinds = new Set<NotificationKind>(NEEDS_NOTIFICATION_KINDS);
const kindLabels: Record<NotificationKind, string> = {
  assignment: "Assignment",
  mention: "Mention",
  approaching_deadline: "Deadline",
  evidence_update: "Evidence",
  decision_request: "Decision",
  recovery_outcome: "Recovery",
  sync_failure: "Connection",
  high_value_case_alert: "High value",
};
const kindColours: Record<NotificationKind, string> = {
  assignment: "#64686d",
  mention: "#64686d",
  approaching_deadline: "#b0431a",
  evidence_update: "#c98a1a",
  decision_request: "#b0431a",
  recovery_outcome: "#1a6b43",
  sync_failure: "#b0431a",
  high_value_case_alert: "#b0431a",
};
const shadow = "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)";

function sourceNotification(item: NotificationItem) {
  return item.kind === "sync_failure" || item.target_href.startsWith("/sources/") || item.target_href.startsWith("/financials/reconciliation");
}

function groupLabel(item: NotificationItem) {
  const created = Date.parse(item.created_at);
  if (Number.isNaN(created)) return "Earlier";
  const age = Date.now() - created;
  if (age <= 86_400_000) return "Today";
  if (age <= 172_800_000) return "Yesterday";
  return "Earlier";
}

function relativeTime(value: string) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return "time unavailable";
  const minutes = Math.floor(Math.max(0, Date.now() - time) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateTime(value);
}

function moveFocus(event: KeyboardEvent<HTMLButtonElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const region = event.currentTarget.closest("#notification-list");
  const triggers = region ? [...region.querySelectorAll<HTMLButtonElement>("[data-notification-trigger]")] : [];
  if (!triggers.length) return;
  const current = triggers.indexOf(event.currentTarget);
  const next = event.key === "Home" ? 0 : event.key === "End" ? triggers.length - 1 : event.key === "ArrowDown" ? Math.min(triggers.length - 1, current + 1) : Math.max(0, current - 1);
  event.preventDefault();
  triggers[next]?.focus();
}

export function NotificationCentre({
  initialNotifications,
  initialCounts,
  initialNextCursor = null,
  initialFilter = "all",
  initialCursor = null,
}: {
  initialNotifications: NotificationItem[];
  initialCounts?: NotificationCounts;
  initialNextCursor?: string | null;
  initialFilter?: NotificationFilter;
  initialCursor?: string | null;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<NotificationFilter>(initialFilter);
  const [counts, setCounts] = useState<NotificationCounts>(() => initialCounts ?? { all: initialNotifications.length, unread: initialNotifications.filter((item) => !item.read_at).length, needs: initialNotifications.filter((item) => !item.read_at && needsKinds.has(item.kind)).length, sources: initialNotifications.filter(sourceNotification).length });
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([initialCursor]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [digestPreview, setDigestPreview] = useState<DigestPreview | null>(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const groups = useMemo(() => ["Today", "Yesterday", "Earlier"].map((label) => ({ label, items: notifications.filter((item) => groupLabel(item) === label) })).filter((group) => group.items.length), [notifications]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("unauth:notification-unread-change", { detail: { unreadCount: counts.unread } }));
  }, [counts.unread]);

  function updateLocation(nextFilter: NotificationFilter, cursor: string | null) {
    const params = new URLSearchParams();
    if (nextFilter !== "all") params.set("tab", nextFilter);
    if (cursor) params.set("cursor", cursor);
    replaceHistoryUrlIfChanged(`/notifications${params.size ? `?${params}` : ""}`);
  }

  async function loadPage(nextFilter: NotificationFilter, cursor: string | null) {
    setLoadingPage(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ filter: nextFilter, limit: "20" });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/notifications?${params}`);
      const body = await response.json() as { items?: NotificationItem[]; counts?: NotificationCounts; pageInfo?: { nextCursor?: string | null }; error?: string };
      if (!response.ok || !body.items || !body.counts || !body.pageInfo) throw new Error(body.error ?? "Notifications could not be loaded.");
      setNotifications(body.items);
      setCounts(body.counts);
      setNextCursor(body.pageInfo.nextCursor ?? null);
      updateLocation(nextFilter, cursor);
      return true;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Notifications could not be loaded.");
      return false;
    } finally {
      setLoadingPage(false);
    }
  }

  function changeFilter(next: NotificationFilter) {
    if (next === filter || loadingPage) return;
    setFilter(next);
    setCursorHistory([null]);
    setPageIndex(0);
    void loadPage(next, null);
  }

  async function movePage(cursor: string | null, index: number) {
    if (loadingPage) return;
    if (await loadPage(filter, cursor)) setPageIndex(index);
  }

  async function markRead(item: NotificationItem) {
    if (item.read_at) return true;
    setBusy(item.id);
    setMessage("");
    try {
      const response = await fetch(`/api/notifications/${item.id}/read`, { method: "POST" });
      if (!response.ok) throw new Error("Could not mark this notification as read");
      const readAt = new Date().toISOString();
      setNotifications((rows) => filter === "unread" || filter === "needs" ? rows.filter((row) => row.id !== item.id) : rows.map((row) => row.id === item.id ? { ...row, read_at: readAt } : row));
      setCounts((value) => ({ ...value, unread: Math.max(0, value.unread - 1), needs: needsKinds.has(item.kind) ? Math.max(0, value.needs - 1) : value.needs }));
      return true;
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Notification action failed");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function open(item: NotificationItem) {
    if (await markRead(item)) router.push(item.target_href);
  }

  async function markAllRead() {
    setBusy("all");
    setMessage("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_all_read" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not mark notifications as read");
      setNotifications((rows) => filter === "unread" || filter === "needs" ? [] : rows.map((row) => ({ ...row, read_at: row.read_at ?? body.readAt })));
      setCounts((value) => ({ ...value, unread: 0, needs: 0 }));
      setMessage(`${body.updated} notification${body.updated === 1 ? "" : "s"} marked as read.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Notification action failed");
    } finally {
      setBusy(null);
    }
  }

  async function loadDigest() {
    setDigestLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/notifications/digest-preview");
      const body = await response.json() as { preview?: DigestPreview; error?: string };
      if (!response.ok || !body.preview) throw new Error(body.error ?? "Digest preview unavailable.");
      setDigestPreview(body.preview);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Digest preview unavailable.");
    } finally {
      setDigestLoading(false);
    }
  }

  const goNext = () => {
    if (!nextCursor) return;
    const history = [...cursorHistory.slice(0, pageIndex + 1), nextCursor];
    setCursorHistory(history);
    void movePage(nextCursor, pageIndex + 1);
  };
  const goPrevious = () => { if (pageIndex > 0) void movePage(cursorHistory[pageIndex - 1] ?? null, pageIndex - 1); };

  return <>
    <h1 data-reference-ignore="accessibility-heading" className="sr-only">Notifications</h1>
    <div style={{ height: 54, flex: 'none', display: "flex", alignItems: "center", gap: 14, padding: "0 22px", borderBottom: "1px solid #eae8e5" }}><Metric value={counts.needs} label="need you" tone="#b0431a" /><Divider /><Metric value={counts.unread} label="unread" /><Divider /><Metric value="—" label="next digest schedule unavailable" /><span style={{ flex: 1 }} /><button type="button" disabled={!counts.unread || busy === "all"} onClick={() => void markAllRead()} style={quietButton(!counts.unread || busy === "all")}>{busy === "all" ? "Marking…" : "Mark all read"}</button><button type="button" disabled={digestLoading} onClick={() => void loadDigest()} style={primaryButton(digestLoading)}>{digestLoading ? "Loading…" : "Preview the digest"}</button></div>
    <div data-screen-label="Notifications" data-visual-world="supplied-package" data-surface-id="notifications-inbox" data-archetype="P5" data-operations-surface="notifications" data-state-id={!loadingPage && notifications.length === 0 ? "notifications-empty-states" : undefined} style={{ flex: 1, minHeight: 0, padding: "16px 22px 20px", display: "flex", gap: 14 }}>
      <section style={{ width: 288, flex: "none", display: "flex", flexDirection: "column", gap: 11 }}><div style={eyebrow}>IN APP</div><div id="notification-list" role="tabpanel" style={{ ...surface, padding: "4px 14px 12px", flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div role="tablist" aria-label="Notification filters" style={{ display: "flex", gap: 4, padding: "7px 0" }}>{([["all", "All"], ["unread", "Unread"], ["needs", "Needs"], ["sources", "Sources"]] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => changeFilter(key)} style={{ appearance: "none", border: 0, borderRadius: 7, padding: "5px 7px", background: filter === key ? "#1c1f23" : "#f4f3f1", color: filter === key ? "#fff" : "#64686d", font: "400 9.5px/1 'Inter',sans-serif", cursor: "pointer" }}>{label} · {counts[key]}</button>)}</div>
        {message ? <p role="status" style={{ margin: "4px 0", padding: "7px 8px", borderRadius: 7, background: "#fff3e9", color: "#7a5310", font: "400 10.5px/1.4 'Inter',sans-serif" }}>{message}</p> : null}
        {loadingPage ? <Empty title="Loading notifications…" body="The current filter and cursor are being resolved." /> : notifications.length ? groups.map((group) => <section key={group.label} aria-labelledby={`notification-group-${group.label.toLowerCase()}`}><div id={`notification-group-${group.label.toLowerCase()}`} style={{ padding: "11px 0 2px", color: "#64686d", letterSpacing: ".06em", font: "400 10px/1 'IBM Plex Mono',monospace", textTransform: "uppercase" }}>{group.label}</div>{group.items.map((item) => <button key={item.id} type="button" data-notification-trigger onKeyDown={moveFocus} disabled={busy === item.id} onClick={() => void open(item)} style={{ width: "100%", display: "flex", gap: 9, padding: "10px 0", border: 0, borderTop: "1px solid #f4f2ef", background: "#fff", textAlign: "left", cursor: "pointer" }}><span style={{ width: 6, height: 6, flex: "none", borderRadius: "50%", background: kindColours[item.kind], marginTop: 5 }} /><span style={{ flex: 1, minWidth: 0 }}><span style={{ display: "block", color: "#1c1f23", font: `${item.read_at ? 400 : 500} 12px/1.45 'Inter',sans-serif` }}>{item.title}</span>{item.body ? <span style={{ display: "block", marginTop: 4, color: "#40454a", font: "400 11.5px/1.5 Inter,sans-serif" }}>{item.body}</span> : null}<span style={{ display: "block", marginTop: 3, color: "#64686d", font: "400 10.5px/1.5 'IBM Plex Mono',monospace" }}>{relativeTime(item.created_at)} · {kindLabels[item.kind]}</span></span>{!item.read_at ? <span aria-label="Unread" style={{ width: 5, height: 5, flex: "none", borderRadius: "50%", background: "#ff7a30", marginTop: 6 }} /> : null}</button>)}</section>) : <div data-state-id={filter === "unread" ? "notifications-caught-up" : "notifications-first-use"}><Empty title={filter === "unread" ? "You are caught up" : filter === "needs" ? "Nothing needs you" : filter === "sources" ? "No source notifications" : "No notifications yet"} body="New deadlines, assignments, evidence changes, recovery outcomes and source issues will appear here." /></div>}
        <span style={{ display: "block", minHeight: 8 }} /><div style={{ borderTop: "1px solid #e4e3e0", paddingTop: 10, color: "#64686d", font: "400 11px/1.5 'Inter',sans-serif" }}>Every line is a recorded thing that may need attention, not a notification about a notification.</div>{pageIndex > 0 || nextCursor ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, paddingTop: 9 }}><button type="button" aria-label="Previous notification page" disabled={pageIndex <= 0 || loadingPage} onClick={goPrevious} style={pagerButton}>←</button><button type="button" aria-label="Next notification page" disabled={!nextCursor || loadingPage} onClick={goNext} style={pagerButton}>→</button></div> : null}
      </div></section>

      <section style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 11 }}><div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={eyebrow}>DIGEST PREVIEW</span><span style={{ flex: 1 }} /><span style={{ color: "#64686d", font: "400 10.5px/1 'IBM Plex Mono',monospace" }}>{digestPreview ? `generated ${formatDateTime(digestPreview.generatedAt)}` : "preview not loaded"}</span></div><div style={{ flex: 1, minHeight: 0, padding: 16, borderRadius: 13, background: "#efece8", display: "flex", justifyContent: "center" }}><div style={{ width: "100%", maxWidth: 520, borderRadius: 8, background: "#fff", boxShadow: "0 6px 20px rgba(40,32,22,.13),0 0 0 1px rgba(28,27,25,.05)", display: "flex", flexDirection: "column", overflow: "hidden" }}><div style={{ padding: "12px 20px", borderBottom: "1px solid #eae8e5", display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 18, height: 18, borderRadius: 5, background: "#ff7a30", color: "#fff", textAlign: "center", font: "500 9px/18px 'IBM Plex Mono',monospace" }}>U</div><span style={{ color: "#64686d", font: "400 11px/1.4 'IBM Plex Mono',monospace" }}>Unauth workspace digest</span></div>{digestPreview ? <div style={{ padding: "20px", overflowY: "auto" }}><h2 style={{ margin: 0, color: "#1c1f23", font: "500 17px/1.35 'Inter',sans-serif" }}>{digestPreview.subject}</h2><div style={{ display: "flex", gap: 10, marginTop: 16 }}><DigestMetric value={digestPreview.notificationCount} label="notifications" /><DigestMetric value={digestPreview.unreadCount} label="unread" /></div><ol style={{ margin: "18px 0 0", paddingLeft: 18, color: "#40454a", font: "400 11.5px/1.55 Inter,sans-serif" }}>{digestPreview.items.map(item => <li key={item.id} style={{ marginBottom: 12 }}><Link href={item.href} style={{ color: "#9b470d" }}>{item.title}</Link>{item.body ? <p style={{ margin: "3px 0" }}>{item.body}</p> : null}<time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time></li>)}</ol></div> : <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 30, textAlign: "center" }}><div><h2 style={{ margin: 0, font: "500 17px/1.35 'Inter',sans-serif" }}>Preview the current digest</h2><p style={{ maxWidth: 340, margin: "8px auto 0", color: "#64686d", font: "400 11.5px/1.5 'Inter',sans-serif" }}>The preview is generated from the current inbox. Delivery remains disabled and no email or provider call is made.</p></div></div>}<div style={{ marginTop: "auto", padding: "12px 20px", borderTop: "1px solid #eae8e5", background: "#ffffff", color: "#64686d", font: "400 10.5px/1.6 'IBM Plex Mono',monospace" }}>Preview only · email delivery and scheduling unavailable</div></div></div></section>

      <aside style={{ width: 286, flex: "none", padding: "12px 13px", borderRadius: 13, background: "#f4f3f1", display: "flex", flexDirection: "column", gap: 11 }}><div style={eyebrow}>WHAT INTERRUPTS YOU</div><section style={{ ...surface, padding: "5px 13px 8px" }}>{[["A deadline inside 48 hours", "approaching_deadline"], ["A source stops returning data", "sync_failure"], ["A recovery record changes", "recovery_outcome"], ["A decision needs you", "decision_request"], ["Evidence changes", "evidence_update"], ["Someone mentions you", "mention"]].map(([label, kind], index) => <div key={kind} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: index ? "1px solid #f4f2ef" : undefined }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: "#1c1f23", font: "400 11.5px/1.4 'Inter',sans-serif" }}>{label}</div><div style={{ marginTop: 2, color: "#64686d", font: "400 10px/1.4 'IBM Plex Mono',monospace" }}>in app only</div></div><span style={{ color: "#64686d", fontSize: 10 }}>Event type</span></div>)}</section><div style={{ paddingTop: 2, ...eyebrow }}>THE DIGEST</div><section style={{ ...surface, padding: "12px 13px", display: "flex", flexDirection: "column", gap: 10 }}><div style={{ color: "#1c1f23", font: "400 11.5px/1.4 'Inter',sans-serif" }}>Schedule unavailable</div><div style={{ color: "#64686d", font: "400 11px/1.5 'Inter',sans-serif" }}>The current preference store exposes in-app event choices but no approved email schedule or recipient list.</div></section><span style={{ flex: 1 }} /><div style={{ borderTop: "1px solid #e4e3e0", paddingTop: 10, color: "#64686d", font: "400 11px/1.5 'Inter',sans-serif" }}>Per-person in-app delivery lives in <Link href="/settings/product/notifications" style={{ color: "#9b470d", textDecoration: "none" }}>settings</Link>.</div></aside>
    </div>
  </>;
}

const surface = { background: "#fff", borderRadius: 10, boxShadow: shadow } as const;
const eyebrow = { color: "#64686d", letterSpacing: ".09em", font: "600 10.5px/1 'Inter',sans-serif" } as const;
const pagerButton = { width: 27, height: 27, border: 0, borderRadius: 7, boxShadow: "inset 0 0 0 1px rgba(28,27,25,.1)", background: "#fff", color: "#40454a" } as const;
function quietButton(disabled = false) { return { appearance: "none" as const, border: 0, padding: "6px 10px", borderRadius: 9, background: "#fff", boxShadow: "inset 0 0 0 1px rgba(28,27,25,.11)", color: "#40454a", opacity: disabled ? .45 : 1, font: "400 12.5px/1 'Inter',sans-serif", cursor: disabled ? "not-allowed" : "pointer" }; }
function primaryButton(disabled = false) { return { ...quietButton(disabled), background: "#1c1f23", color: "#fff", boxShadow: "none", fontWeight: 500 }; }
function Metric({ value, label, tone = "#40454a" }: { value: number | string; label: string; tone?: string }) { return <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ color: tone, font: "400 17px/1 'IBM Plex Mono',monospace" }}>{typeof value === "number" ? formatNumber(value) : value}</span><span style={{ color: "#64686d", font: "400 11.5px/1 'Inter',sans-serif" }}>{label}</span></div>; }
function Divider() { return <div style={{ width: 1, height: 22, background: "#eae8e5" }} />; }
function Empty({ title, body }: { title: string; body: string }) { return <div style={{ minHeight: 180, display: "grid", placeContent: "center", textAlign: "center", padding: 20 }}><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#64686d" strokeWidth="1.4" style={{ margin: "0 auto 8px" }}><path d="M6 10a5 5 0 0 1 10 0c0 3 1.4 4.5 1.4 4.5H4.6S6 13 6 10Z"/><path d="M9.5 17a1.8 1.8 0 0 0 3 0"/></svg><h2 style={{ margin: 0, font: "500 13px/1.4 'Inter',sans-serif" }}>{title}</h2><p style={{ maxWidth: 240, margin: "5px 0 0", color: "#64686d", font: "400 11px/1.5 'Inter',sans-serif" }}>{body}</p></div>; }
function DigestMetric({ value, label }: { value: number; label: string }) { return <div style={{ flex: 1, padding: "11px 12px", borderRadius: 9, background: "#f4f3f1" }}><div style={{ color: "#1c1f23", font: "400 16px/1 'IBM Plex Mono',monospace" }}>{formatNumber(value)}</div><div style={{ marginTop: 5, color: "#64686d", font: "400 10.5px/1.4 'Inter',sans-serif" }}>{label}</div></div>; }
