"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Inbox } from "lucide-react";
import { StatusBadge, PriorityChip } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SourceMark } from "@/components/identity/ProviderLogo";
import { RowActionsMenu, type RowAction } from "@/components/ui/RowActionsMenu";
import { formatDateAbsolute, formatNumber } from "@/lib/utils/format";

export type WorkQueueItem = {
  id: string;
  kind: "task" | "exception";
  title: string;
  description: string | null;
  ownerRole: string | null;
  ownerUserId: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  createdAt: string | null;
  supportPayoutCaseId: string | null;
  objectHref: string | null;
  objectLabel: string;
  blockingReason: string | null;
  source: string | null;
};

const VIEWS = [
  ["open", "Open"],
  ["mine", "My work"],
  ["unassigned", "Unassigned"],
  ["due-today", "Due today"],
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

function dueState(value: string | null) {
  if (!value)
    return { label: "No deadline", className: "text-[var(--text-tertiary)]" };
  const due = Date.parse(value);
  const remaining = due - Date.now();
  if (remaining < 0)
    return {
      label: `Overdue · ${date(value)}`,
      className: "text-[var(--danger)]",
    };
  if (remaining < 86400000)
    return {
      label: `Due today · ${date(value)}`,
      className: "text-[var(--warning)]",
    };
  return { label: date(value), className: "text-[var(--text-secondary)]" };
}

type WorkAction = "assign_to_me" | "start" | "complete" | "reopen" | "snooze";

function WorkItemActions({
  item,
  busy,
  onAction,
}: {
  item: WorkQueueItem;
  busy: string | null;
  onAction: (item: WorkQueueItem, action: WorkAction) => void;
}) {
  const disabled = busy?.startsWith(`${item.kind}:${item.id}:`) ?? false;
  const actions: RowAction[] = [];
  if (item.kind === "exception") {
    actions.push({ label: "Assign to me", onSelect: () => onAction(item, "assign_to_me"), disabled });
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
}: {
  items: WorkQueueItem[];
  total: number;
  view: string;
  viewCounts: WorkViewCounts;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const selectableIds = items.reduce<string[]>((ids, item) => {
    if (item.kind === "task") ids.push(item.id);
    return ids;
  }, []);

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
              ? { until: new Date(Date.now() + 86400000).toISOString() }
              : {}),
          }
        : { assignToMe: true };
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
            ? { until: new Date(Date.now() + 86400000).toISOString() }
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
    return `${item.objectHref}${item.objectHref.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(`/work?view=${view}`)}`;
  }

  function openRow(item: WorkQueueItem, target: EventTarget | null) {
    const href = itemHref(item);
    if (!href) return;
    if (target instanceof HTMLElement && target.closest("a, button, input, select, textarea, [role='menu']")) return;
    router.push(href);
  }

  return (
    <section aria-labelledby="work-queue-title">
      <h2 id="work-queue-title" className="sr-only">
        Work queue
      </h2>
      <nav
        aria-label="Work views"
        className="mb-3 flex gap-1 overflow-x-auto pb-1"
      >
        {VIEWS.map(([key, label]) => (
          <Link
            key={key}
            href={`/work?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className="inline-flex h-7 items-center whitespace-nowrap rounded-[var(--ua-radius-input)] border px-2.5 text-[11px] font-medium"
            style={{
              background:
                view === key ? "var(--surface-selected)" : "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            {label}
            <span className="ml-1.5 tabular-nums text-[10px] text-[var(--text-tertiary)]">{formatNumber(viewCounts[key])}</span>
          </Link>
        ))}
      </nav>
      {error ? (
        <div
          role="alert"
          className="mb-3 rounded border border-[var(--danger)] p-3 text-sm"
        >
          {error}
        </div>
      ) : null}
      {selected.size ? (
        <div
          className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-3"
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
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${action === "complete" ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[var(--surface)]"}`}
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
            className="px-2 py-1.5 text-xs text-[var(--text-secondary)]"
          >
            Clear
          </button>
        </div>
      ) : null}
      {!items.length ? (
        <div className="ua-section-panel overflow-hidden rounded-lg">
          <EmptyState
            icon={<Inbox />}
            title="No work matches this view"
            description="Choose another saved view or return when new work arrives. New cases and integration exceptions will appear here automatically."
          />
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] md:block">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="sticky top-0 bg-[var(--surface-sunken)] text-left text-xs text-[var(--text-secondary)]">
                <tr>
                  <th
                    scope="col"
                    className="border-b border-[var(--border)] px-3 py-2.5"
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
                    "Due / SLA",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="border-b border-[var(--border)] px-3 py-2.5 font-medium"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const due = dueState(item.dueAt);
                  const description = usefulDescription(item);
                  const href = itemHref(item);
                  return (
                    <tr
                      key={`${item.kind}:${item.id}`}
                      className={`ua-table-row border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)] focus-within:bg-[var(--surface-hover)] ${href ? "cursor-pointer" : ""}`}
                      tabIndex={href ? 0 : undefined}
                      aria-label={href ? `Open ${item.objectLabel}` : undefined}
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
                      <td className="px-3 py-2.5">
                        <PriorityChip value={item.priority} size="sm" />
                      </td>
                      <td className="max-w-[340px] px-3 py-2.5">
                        <div className="flex items-start gap-2.5">
                          <SourceMark source={item.source} compact />
                          <div className="min-w-0">
                        <div className="font-medium">{item.title}</div>
                        {description ? (
                          <div className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
                            {description}
                          </div>
                        ) : null}
                        {item.blockingReason ? (
                          <div className="mt-1 text-xs text-[var(--warning)]">
                            Blocked: {item.blockingReason}
                          </div>
                        ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {item.objectHref ? (
                          <Link
                            className="font-medium underline underline-offset-2"
                            href={href ?? item.objectHref}
                          >
                            {item.objectLabel}
                          </Link>
                        ) : (
                          item.objectLabel
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge family="caseStatus" value={item.status} size="sm" />
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-2">
                          {item.ownerUserId || item.ownerRole ? <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-selected)] text-[10px] font-bold text-[var(--brand-deep)]">
                            {(item.ownerUserId ? "A" : title(item.ownerRole).slice(0, 2)).toUpperCase()}
                          </span> : null}
                          <span>{item.ownerUserId ? "Assigned" : item.ownerRole ? title(item.ownerRole) : "Unassigned"}</span>
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-xs ${due.className}`}>
                        {due.label}
                      </td>
                      <td className="px-3 py-2.5">
                        <WorkItemActions
                          item={item}
                          busy={busy}
                          onAction={act}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {items.map((item) => {
              const due = dueState(item.dueAt);
              const description = usefulDescription(item);
              const href = itemHref(item);
              return (
                <article
                  key={`${item.kind}:${item.id}`}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
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
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                    <span>
                      {item.objectHref ? (
                        <Link
                          className="underline"
                          href={href ?? item.objectHref}
                        >
                          {item.objectLabel}
                        </Link>
                      ) : (
                        item.objectLabel
                      )}
                    </span>
                    <span>
                      {item.ownerUserId ? "Assigned" : item.ownerRole ? title(item.ownerRole) : "Unassigned"}
                    </span>
                  </div>
                  {item.blockingReason ? (
                    <p className="mt-2 text-xs text-[var(--warning)]">
                      Blocked: {item.blockingReason}
                    </p>
                  ) : null}
                  <div className="mt-4">
                    <WorkItemActions item={item} busy={busy} onAction={act} />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
      <p className="mt-3 text-xs text-[var(--text-secondary)]">
        Showing {items.length} of {total}
      </p>
    </section>
  );
}
