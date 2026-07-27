"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";
import { Inbox } from "lucide-react";
import { StatusBadge, PriorityChip } from "@/components/ui/StatusBadge";
import { EmptyState, Input, Modal } from "@/components/ui";
import { SourceMark } from "@/components/identity/ProviderLogo";
import { RowActionsMenu, type RowAction } from "@/components/ui/RowActionsMenu";
import { formatDateAbsolute, formatNumber } from "@/lib/utils/format";
import { nowMs } from "@/lib/time/clock";
import { label } from "@/lib/ui/labels";
import { ExceptionResolutionDrawer } from "@/components/work/ExceptionResolutionDrawer";

export type WorkQueueItem = {
  id: string;
  kind: "task" | "exception";
  title: string;
  description: string | null;
  ownerRole: string | null;
  ownerUserId: string | null;
  ownerName?: string | null;
  ownerInitials?: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  createdAt: string | null;
  supportPayoutCaseId: string | null;
  objectHref: string | null;
  objectLabel: string;
  blockingReason: string | null;
  source: string | null;
  exceptionType?: string | null;
  exceptionContext?: Record<string, unknown> | null;
  exceptionStateVersion?: number | null;
};

const VIEWS = [
  ["open", "Open"],
  ["mine", "My work"],
  ["unassigned", "Unassigned"],
  ["due-today", "Due today"],
  ["overdue", "Overdue"],
  ["no-sla", "No deadline"],
  ["blocked", "Blocked"],
  ["evidence-needed", "Evidence needed"],
  ["decision-needed", "Decision needed"],
  ["integration-exceptions", "Integration exceptions"],
  ["completed", "Completed"],
] as const;

export type WorkViewKey = (typeof VIEWS)[number][0];
export type WorkViewCounts = Record<WorkViewKey, number>;

const REDUNDANT_DESCRIPTIONS = new Set([
  "Verify the case evidence and record the next merchant action.",
  "Critical evidence is missing, so the agent should collect more information before payout.",
  "This case has been open with no update for over 14 days. It may need chasing, closing, or a decision.",
]);

function usefulDescription(item: WorkQueueItem) {
  if (!item.description || REDUNDANT_DESCRIPTIONS.has(item.description)) return null;
  if (item.description.trim().toLowerCase() === item.title.trim().toLowerCase()) return null;
  return item.description;
}

function blockingLabel(item: WorkQueueItem) {
  if (!item.blockingReason) return null;
  return item.kind === 'exception'
    ? label('exceptionType', item.exceptionType ?? item.blockingReason)
    : item.blockingReason;
}

const title = (value: string | null) =>
  value
    ? value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "—";
const date = (value: string | null) =>
  value && !Number.isNaN(Date.parse(value))
    ? formatDateAbsolute(value)
    : "—";

/*
 * "Due today" is a calendar-day statement, not a 24-hour window. The previous
 * `remaining < 86400000` test labelled a deadline tomorrow morning as due today,
 * which now visibly contradicts the queue pulse's due bands — the bands and the
 * row label must use the same boundary (§6.6: distinct states stay distinct).
 */
function dueState(value: string | null, asOfMs = nowMs()) {
  if (!value)
    return { label: "No deadline", className: "text-[var(--ua-text-tertiary)]" };
  const due = Date.parse(value);
  if (due - asOfMs < 0)
    return {
      label: `Overdue · ${date(value)}`,
      className: "text-[var(--ua-critical)]",
    };
  const tomorrow = new Date(asOfMs);
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (due < tomorrow.getTime())
    return {
      label: `Due today · ${date(value)}`,
      className: "text-[var(--ua-warning)]",
    };
  return { label: date(value), className: "text-[var(--ua-text-secondary)]" };
}

type WorkAction = "assign_to_me" | "release" | "start" | "complete" | "reopen" | "snooze";

function WorkItemActions({
  item,
  busy,
  onAction,
  onOpenException,
}: {
  item: WorkQueueItem;
  busy: string | null;
  onAction: (item: WorkQueueItem, action: WorkAction) => void;
  onOpenException: (item: WorkQueueItem) => void;
}) {
  const disabled = busy?.startsWith(`${item.kind}:${item.id}:`) ?? false;
  const actions: RowAction[] = [];
  if (item.kind === "exception") {
    actions.push({ label: "Review exception", onSelect: () => onOpenException(item), disabled });
    actions.push({ label: item.ownerUserId ? "Release assignment" : "Assign to me", onSelect: () => onAction(item, item.ownerUserId ? "release" : "assign_to_me"), disabled });
  } else if (item.status === "completed") {
    actions.push({ label: "Reopen", onSelect: () => onAction(item, "reopen"), disabled });
  } else {
    if (!item.ownerUserId) {
      actions.push({ label: "Assign to me", onSelect: () => onAction(item, "assign_to_me"), disabled });
    }
    if (item.status !== "in_progress") {
      actions.push({ label: "Start", onSelect: () => onAction(item, "start"), disabled });
    }
    actions.push({ label: "Snooze 1 day", onSelect: () => onAction(item, "snooze"), disabled });
    actions.push({ label: "Complete", onSelect: () => onAction(item, "complete"), disabled });
  }
  return <RowActionsMenu actions={actions} label={`Actions for ${item.title}`} disabled={disabled} />;
}

export function WorkQueue({
  items,
  total,
  view,
  viewCounts,
  page,
  pageSize,
  asOf,
}: {
  items: WorkQueueItem[];
  total: number;
  view: string;
  viewCounts: WorkViewCounts;
  page?: number;
  pageSize?: number;
  asOf?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedException, setSelectedException] = useState<WorkQueueItem | null>(null);
  const [savedViews, setSavedViews] = useState<Array<{ id: string; name: string; definition: Record<string, unknown>; is_shared: boolean }>>([]);
  /*
   * Saved views have three distinct states. "loading" and "ready" are ordinary;
   * "unavailable" means the request failed and must never be presented as
   * "you have not saved any views yet" (RUN-06).
   */
  const [savedViewsState, setSavedViewsState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [savedViewsAttempt, setSavedViewsAttempt] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [shareView, setShareView] = useState(false);
  const [savingView, setSavingView] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');
  const [moreViewsOpen, setMoreViewsOpen] = useState(false);

  /*
   * Filters the loaded page by next action, object and owner. Deliberately
   * client-side: it narrows what is already on screen and does not change the
   * server view, so the tab counts above stay truthful.
   */
  function matchingItems(source: WorkQueueItem[], search: string) {
    const needle = search.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((item) =>
      [item.title, item.objectLabel, item.ownerName ?? '', item.ownerRole ?? '', item.status]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }

  function taskIdsOf(source: WorkQueueItem[]) {
    return source.reduce<string[]>((ids, item) => {
      if (item.kind === "task") ids.push(item.id);
      return ids;
    }, []);
  }

  const visibleItems = matchingItems(items, query);
  const selectableIds = taskIdsOf(visibleItems);
  const searchTerm = query.trim();
  const isFiltered = searchTerm.length > 0;
  const parsedAsOf = asOf ? Date.parse(asOf) : Number.NaN;
  const referenceTimeMs = Number.isNaN(parsedAsOf) ? nowMs() : parsedAsOf;
  const resolvedPage = Math.max(1, page ?? 1);
  const resolvedPageSize = Math.max(1, (pageSize ?? items.length) || 1);
  const resultStart = (resolvedPage - 1) * resolvedPageSize + 1;
  const resultEnd = Math.min(resultStart + items.length - 1, total);

  const primaryViews = VIEWS.filter(([key]) =>
    ['open', 'mine', 'unassigned', 'due-today', 'overdue'].includes(key),
  );
  const extraViews = VIEWS.filter(([key]) =>
    !primaryViews.some(([primaryKey]) => primaryKey === key),
  );

  /*
   * Changing the search narrows the result set, so any selection that falls
   * outside the new results is dropped there and then. Keeping it would let a
   * bulk action apply to rows the operator can no longer see (RUN-07).
   */
  function applyQuery(nextQuery: string) {
    setQuery(nextQuery);
    const allowed = new Set(taskIdsOf(matchingItems(items, nextQuery)));
    setSelected((current) => {
      if (!current.size) return current;
      const next = new Set<string>();
      current.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      return next.size === current.size ? current : next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    setSavedViewsState('loading');
    void fetch('/api/work/views')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Saved views request failed with ${response.status}`);
        return (await response.json()) as { views?: Array<{ id: string; name: string; definition: Record<string, unknown>; is_shared: boolean }> };
      })
      .then((body) => {
        if (cancelled) return;
        setSavedViews(body.views ?? []);
        setSavedViewsState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setSavedViews([]);
        setSavedViewsState('unavailable');
      });
    return () => { cancelled = true; };
  }, [savedViewsAttempt]);

  async function saveCurrentView() {
    const name = saveName.trim();
    if (!name) return;
    setSavingView(true);
    setError(null);
    try {
      const response = await fetch('/api/work/views', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, definition: { view }, isShared: shareView }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Unable to save view');
      if (body.view) setSavedViews((current) => [body.view, ...current]);
      setSaveName('');
      setShareView(false);
      setSaveOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save view');
    } finally {
      setSavingView(false);
    }
  }

  async function act(item: WorkQueueItem, action: WorkAction) {
    setBusy(`${item.kind}:${item.id}:${action}`);
    setError(null);
    const endpoint =
      item.kind === "task"
        ? `/api/work-tasks/${item.id}`
        : `/api/ops/exceptions/${item.id}`;
    const method = "PATCH";
    const body =
      item.kind === "task"
        ? {
            action,
            ...(action === "snooze"
              ? { until: new Date(nowMs() + 86400000).toISOString() }
              : {}),
          }
        : action === "release" ? { release: true } : { assignToMe: true };
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Action failed");
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Action failed",
      );
    } finally {
      setBusy(null);
    }
  }

  async function bulkAct(
    action: "assign_to_me" | "start" | "complete" | "snooze",
  ) {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(`bulk:${action}`);
    setError(null);
    try {
      const response = await fetch("/api/work-tasks/bulk", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ids,
          action,
          ...(action === "snooze"
            ? { until: new Date(nowMs() + 86400000).toISOString() }
            : {}),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Bulk action failed");
      setSelected(new Set());
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Bulk action failed",
      );
    } finally {
      setBusy(null);
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function itemHref(item: WorkQueueItem) {
    if (!item.objectHref) return null;
    const [pathAndQuery, fragment] = item.objectHref.split("#", 2);
    const withReturn = `${pathAndQuery}${pathAndQuery.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(`/work?view=${view}`)}`;
    return fragment ? `${withReturn}#${fragment}` : withReturn;
  }

  function openRow(item: WorkQueueItem, target: EventTarget | null) {
    const href = itemHref(item);
    if (target instanceof HTMLElement && target.closest("a, button, input, select, textarea, [role='menu']")) return;
    if (href) {
      router.push(href);
    } else if (item.kind === "exception") {
      setSelectedException(item);
    }
  }

  return (
    <section aria-labelledby="work-queue-title">
      <h2 id="work-queue-title" className="sr-only">
        Work queue
      </h2>
      <nav
        aria-label="Work views"
        className="mb-3 flex flex-wrap items-center gap-1.5"
      >
        {primaryViews.map(([key, label]) => (
          <Link
            key={key}
            href={`/work?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className="inline-flex h-7 items-center whitespace-nowrap rounded-[var(--ua-radius-control)] border px-2.5 text-[length:var(--ua-text-metadata-size)] font-medium"
            style={{
              background:
                view === key ? "var(--ua-accent-100)" : "var(--ua-surface-primary)",
              borderColor:
                view === key ? "var(--ua-accent-200)" : "var(--ua-border-default)",
              color: view === key ? "var(--ua-accent-800)" : undefined,
            }}
          >
            {label}
            <span className="ml-1.5 tabular-nums text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{formatNumber(viewCounts[key])}</span>
          </Link>
        ))}
        {!primaryViews.some(([key]) => key === view) ? (() => {
          const current = VIEWS.find(([key]) => key === view);
          return current ? (
            <Link
              href={`/work?view=${current[0]}`}
              aria-current="page"
              className="inline-flex h-7 items-center whitespace-nowrap rounded-[var(--ua-radius-control)] border px-2.5 text-[length:var(--ua-text-metadata-size)] font-medium"
              style={{ background: 'var(--ua-surface-selected)', borderColor: 'var(--ua-border-default)' }}
            >
              {current[1]}
              <span className="ml-1.5 tabular-nums text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{formatNumber(viewCounts[current[0]])}</span>
            </Link>
          ) : null;
        })() : null}
        <button
          type="button"
          aria-expanded={moreViewsOpen}
          aria-controls="work-more-views"
          onClick={() => setMoreViewsOpen((open) => !open)}
          className="inline-flex h-7 items-center whitespace-nowrap rounded-[var(--ua-radius-control)] border px-2.5 text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)]"
          style={{ borderColor: 'var(--ua-border-default)', background: moreViewsOpen ? 'var(--ua-surface-selected)' : 'var(--ua-surface-primary)' }}
        >
          More views
          <span className="ml-1.5 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{extraViews.length + savedViews.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setSaveOpen(true)}
          className="inline-flex h-7 items-center whitespace-nowrap rounded-[var(--ua-radius-control)] border border-dashed px-2.5 text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)]"
        >
          Save view
        </button>
      </nav>
      {moreViewsOpen ? (
        <div id="work-more-views" className="mb-3 flex flex-wrap items-center gap-1.5 border-y border-[var(--ua-border-subtle)] py-2" role="group" aria-label="More Work views">
          <span className="mr-1 text-[length:var(--ua-text-metadata-size)] font-semibold text-[var(--ua-text-tertiary)]">More</span>
          {extraViews.map(([key, label]) => (
            <Link
              key={key}
              href={`/work?view=${key}`}
              aria-current={view === key ? 'page' : undefined}
              className="inline-flex h-7 items-center whitespace-nowrap rounded-[var(--ua-radius-control)] border px-2.5 text-[length:var(--ua-text-metadata-size)] font-medium"
              style={{ background: view === key ? 'var(--ua-accent-100)' : 'var(--ua-surface-primary)', borderColor: view === key ? 'var(--ua-accent-200)' : 'var(--ua-border-default)' }}
            >
              {label}
              <span className="ml-1.5 tabular-nums text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{formatNumber(viewCounts[key])}</span>
            </Link>
          ))}
          {savedViews.map((saved) => {
            const savedView = typeof saved.definition?.view === 'string' ? saved.definition.view : 'open';
            return <Link key={saved.id} href={`/work?view=${encodeURIComponent(savedView)}`} className="inline-flex h-7 items-center gap-1.5 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-selected)] px-2.5 text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)]">{saved.name}{saved.is_shared ? <span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">Shared</span> : null}</Link>;
          })}
          {savedViewsState === 'ready' && savedViews.length === 0 ? <span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">No saved views yet.</span> : null}
        </div>
      ) : null}
      {savedViewsState === 'unavailable' ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 text-[length:var(--ua-text-caption-size)] text-[var(--ua-text-secondary)]"
          role="status"
        >
          <span>We couldn&rsquo;t load your saved views. The views above still work.</span>
          <button
            type="button"
            onClick={() => setSavedViewsAttempt((attempt) => attempt + 1)}
            className="inline-flex h-7 items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-2.5 font-semibold text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)]"
          >
            Try again
          </button>
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-[260px]">
          <Input
            type="search"
            value={query}
            aria-label="Search this view"
            placeholder="Search next action, object, owner…"
            onChange={(event) => applyQuery(event.target.value)}
          />
        </div>
      </div>
      {error ? (
        <div
          role="alert"
          className="mb-3 rounded border border-[var(--ua-critical)] p-3 text-sm"
        >
          {error}
        </div>
      ) : null}
      {selected.size ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] p-3"
          role="toolbar"
          aria-label="Bulk task actions"
        >
          <span className="mr-auto text-sm font-semibold">
            {selected.size} selected
          </span>
          {(["assign_to_me", "start", "snooze", "complete"] as const).map(
            (action) => (
              <button
                key={action}
                type="button"
                disabled={busy?.startsWith("bulk:")}
                onClick={() => bulkAct(action)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${action === "complete" ? "border-[var(--ua-action-primary)] bg-[var(--ua-action-primary)] text-[var(--ua-action-primary-fg)]" : "border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)]"}`}
              >
                {action === "assign_to_me"
                  ? "Assign to me"
                  : action === "snooze"
                    ? "Snooze 1 day"
                    : title(action)}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="px-2 py-1.5 text-xs text-[var(--ua-text-secondary)]"
          >
            Clear
          </button>
        </div>
      ) : null}
      {isFiltered && !visibleItems.length ? (
        <div className="ua-section-panel overflow-hidden rounded-lg">
          <EmptyState
            icon={<Inbox />}
            title={`No results for “${searchTerm}”`}
            description="Nothing in this view matches your search. Clear the search to see the whole view."
            action={
              <button
                type="button"
                onClick={() => applyQuery('')}
                className="inline-flex h-9 items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 text-sm font-semibold text-[var(--ua-text-primary)] hover:bg-[var(--ua-surface-hover)]"
              >
                Clear search
              </button>
            }
          />
        </div>
      ) : !visibleItems.length ? (
        <div className="ua-section-panel overflow-hidden rounded-lg">
          <EmptyState
            icon={<Inbox />}
            title={view === 'open' && total === 0 ? 'No open work' : 'No work matches this view'}
            description={view === 'open' && total === 0
              ? 'Connect a source to create work.'
              : 'Choose another saved view or return when new work arrives. New cases and integration exceptions will appear here automatically.'}
            action={view === 'open' && total === 0 ? <Link href="/integrations" className="inline-flex h-9 items-center rounded-[var(--ua-radius-control)] bg-[var(--ua-action-primary)] px-3 text-sm font-semibold text-[var(--ua-action-primary-fg)]">Review integrations</Link> : undefined}
          />
        </div>
      ) : (
        <>
          <div className="ua-operational-scrollbar hidden overflow-x-auto rounded-[var(--ua-radius-surface)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] md:block" tabIndex={0} role="region" aria-label="Work queue table, scrolls horizontally">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              {/*
                Explicit widths (§6.6: status, date, source and action columns keep
                consistent widths). Without them the Deadline column collapsed and
                wrapped "Overdue · 31 May 2026" onto three lines, which swung row
                heights between 40px and 90px.
              */}
              <colgroup>
                <col style={{ width: 36 }} />
                <col style={{ width: 84 }} />
                <col />
                <col style={{ width: 118 }} />
                <col style={{ width: 96 }} />
                <col style={{ width: 116 }} />
                <col style={{ width: 132 }} />
                <col style={{ width: 44 }} />
              </colgroup>
              <thead className="sticky top-0 bg-[var(--ua-surface-secondary)] text-left text-[length:var(--ua-text-caption-size)] font-medium text-[var(--ua-text-secondary)]">
                <tr>
                  <th
                    scope="col"
                    className="border-b border-[var(--ua-border-default)] px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      aria-label="Select all tasks on this page"
                      checked={
                        selectableIds.length > 0 &&
                        selectableIds.every((id) => selected.has(id))
                      }
                      onChange={() =>
                        setSelected(
                          selectableIds.every((id) => selected.has(id))
                            ? new Set()
                            : new Set(selectableIds),
                        )
                      }
                    />
                  </th>
                  {[
                    "Priority",
                    "Next action",
                    "Object",
                    "Status",
                    "Owner",
                    "Deadline",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="border-b border-[var(--ua-border-default)] px-3 py-2.5 font-medium"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const due = dueState(item.dueAt, referenceTimeMs);
                  const description = usefulDescription(item);
                  const href = itemHref(item);
                  const block = blockingLabel(item);
                  return (
                    <tr
                      key={`${item.kind}:${item.id}`}
                      className={`ua-table-row border-b border-[var(--ua-border-default)] last:border-0 hover:bg-[var(--ua-surface-hover)] focus-within:bg-[var(--ua-surface-hover)] ${href || item.kind === "exception" ? "cursor-pointer" : ""}`}
                      tabIndex={href || item.kind === "exception" ? 0 : undefined}
                      aria-label={href ? `Open ${item.objectLabel}` : item.kind === "exception" ? `Review ${item.title}` : undefined}
                      onClick={(event) => openRow(item, event.target)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") openRow(item, event.target);
                      }}
                    >
                      <td className="px-3 py-2.5">
                        {item.kind === "task" ? (
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.title}`}
                            checked={selected.has(item.id)}
                            onChange={() => toggle(item.id)}
                          />
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <PriorityChip value={item.priority} size="sm" />
                      </td>
                      <td className="max-w-[340px] px-3 py-2.5">
                        <div className="flex items-start gap-2.5">
                          <SourceMark source={item.source} compact />
                          <div className="min-w-0">
                        <div className="font-medium">{item.title}</div>
                        {description ? (
                          <div className="mt-0.5 line-clamp-1 text-xs text-[var(--ua-text-secondary)]">
                            {description}
                          </div>
                        ) : null}
                        {block ? (
                          <div className="mt-1 line-clamp-1 text-xs text-[var(--ua-warning)]" title={`Needs attention: ${block}`}>
                            Needs attention: {block}
                          </div>
                        ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {item.objectHref ? (
                          <Link
                            className="font-medium underline underline-offset-2"
                            href={href ?? item.objectHref}
                          >
                            {item.objectLabel}
                          </Link>
                        ) : item.kind === "exception" ? (
                          <button type="button" className="font-medium text-[var(--ua-text-primary)] underline underline-offset-2" onClick={(event) => { event.stopPropagation(); setSelectedException(item); }}>
                            Review exception
                          </button>
                        ) : item.objectLabel}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge family="caseStatus" value={item.status} size="sm" />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="flex min-w-0 items-center gap-2">
                          {item.ownerUserId || item.ownerRole ? <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ua-border-default)] bg-[var(--ua-surface-selected)] text-[length:var(--ua-text-metadata-size)] font-bold text-[var(--ua-text-primary)]">
                            {(item.ownerInitials ?? (item.ownerName ? item.ownerName.slice(0, 2) : title(item.ownerRole).slice(0, 2))).toUpperCase()}
                          </span> : null}
                          <span className="min-w-0 truncate" title={item.ownerUserId ? `${item.ownerName ?? 'Assigned'}${item.ownerRole ? ` · ${title(item.ownerRole)}` : ''}` : item.ownerRole ? title(item.ownerRole) : "Unassigned"}>
                            {item.ownerUserId ? item.ownerName ?? "Assigned" : item.ownerRole ? title(item.ownerRole) : "Unassigned"}
                            {item.ownerUserId && item.ownerRole ? <span className="ml-1 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">· {title(item.ownerRole)}</span> : null}
                          </span>
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2.5 text-xs tabular-nums ${due.className}`}>
                        {due.label}
                      </td>
                      <td className="px-3 py-2.5">
                        <WorkItemActions
                          item={item}
                          busy={busy}
                          onAction={act}
                          onOpenException={setSelectedException}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {visibleItems.map((item) => {
              const due = dueState(item.dueAt, referenceTimeMs);
              const description = usefulDescription(item);
              const block = blockingLabel(item);
              const href = itemHref(item);
              return (
                <article
                  key={`${item.kind}:${item.id}`}
                  className="rounded-lg border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      {item.kind === "task" ? (
                        <input
                          type="checkbox"
                          className="mt-1"
                          aria-label={`Select ${item.title}`}
                          checked={selected.has(item.id)}
                          onChange={() => toggle(item.id)}
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <PriorityChip value={item.priority} size="sm" />
                          <StatusBadge family="caseStatus" value={item.status} size="sm" />
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <SourceMark source={item.source} compact />
                          <h3 className="font-semibold">{item.title}</h3>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs ${due.className}`}>
                      {due.label}
                    </span>
                  </div>
                  {description ? (
                    <p className="mt-2 text-sm text-[var(--ua-text-secondary)]">
                      {description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ua-text-secondary)]">
                    <span>
                      {item.objectHref ? (
                        <Link
                          className="underline"
                          href={href ?? item.objectHref}
                        >
                          {item.objectLabel}
                        </Link>
                      ) : item.kind === "exception" ? (
                        <button type="button" className="font-medium text-[var(--ua-text-primary)] underline underline-offset-2" onClick={() => setSelectedException(item)}>
                          Review exception
                        </button>
                      ) : item.objectLabel}
                    </span>
                    <span>
                      {item.ownerUserId ? item.ownerName ?? "Assigned" : item.ownerRole ? title(item.ownerRole) : "Unassigned"}
                      {item.ownerUserId && item.ownerRole ? ` · ${title(item.ownerRole)}` : ''}
                    </span>
                  </div>
                  {block ? (
                    <p className="mt-2 text-xs text-[var(--ua-warning)]">
                      Needs attention: {block}
                    </p>
                  ) : null}
                  <div className="mt-4">
                    <WorkItemActions item={item} busy={busy} onAction={act} onOpenException={setSelectedException} />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
      <p className="mt-3 text-xs text-[var(--ua-text-secondary)]">
        {isFiltered
          ? `${visibleItems.length} of ${items.length} loaded results`
          : total === items.length
            ? `${total} results`
            : `Showing ${resultStart}–${resultEnd} of ${total}`}
      </p>
      <ExceptionResolutionDrawer
        item={selectedException}
        onClose={() => setSelectedException(null)}
        onUpdated={() => router.refresh()}
      />
      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save Work view"
        description="Save the current filter so you can return to it from Work."
        actions={[
          { label: 'Save view', onClick: () => void saveCurrentView(), disabled: !saveName.trim() || savingView },
        ]}
      >
        <label className="block text-sm font-medium text-[var(--ua-text-primary)]">
          View name
          <Input value={saveName} onChange={(event) => setSaveName(event.target.value)} className="mt-1" maxLength={80} placeholder="e.g. Partner deadlines" autoFocus />
        </label>
        <label className="mt-4 flex items-start gap-2 text-sm text-[var(--ua-text-secondary)]">
          <input type="checkbox" checked={shareView} onChange={(event) => setShareView(event.target.checked)} className="mt-0.5" />
          Share with the workspace (admin permission required)
        </label>
      </Modal>
    </section>
  );
}
