"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

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

const title = (value: string | null) =>
  value
    ? value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "—";
const workDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const date = (value: string | null) =>
  value && !Number.isNaN(Date.parse(value))
    ? workDateFormatter.format(new Date(value))
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
  if (item.kind === "exception") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction(item, "assign_to_me")}
        className="rounded border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-50"
      >
        Assign to me
      </button>
    );
  }
  if (item.status === "completed") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction(item, "reopen")}
        className="rounded border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-50"
      >
        Reopen
      </button>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {!item.ownerUserId ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction(item, "assign_to_me")}
          className="rounded border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-50"
        >
          Assign
        </button>
      ) : null}
      {item.status !== "in_progress" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction(item, "start")}
          className="rounded border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-50"
        >
          Start
        </button>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction(item, "snooze")}
        className="rounded border border-[var(--border)] px-2 py-1 text-xs font-medium disabled:opacity-50"
      >
        Snooze 1d
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction(item, "complete")}
        className="rounded bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
      >
        Complete
      </button>
    </div>
  );
}

export function WorkQueue({
  items,
  total,
  view,
}: {
  items: WorkQueueItem[];
  total: number;
  view: string;
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

  return (
    <section aria-labelledby="work-queue-title">
      <h2 id="work-queue-title" className="sr-only">
        Work queue
      </h2>
      <nav
        aria-label="Work views"
        className="mb-4 flex gap-1 overflow-x-auto pb-1"
      >
        {VIEWS.map(([key, label]) => (
          <Link
            key={key}
            href={`/work?view=${key}`}
            aria-current={view === key ? "page" : undefined}
            className="whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium"
            style={{
              background:
                view === key ? "var(--surface-selected)" : "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            {label}
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
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
          <p className="font-medium">No work matches this view</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Choose another saved view or return when new work arrives.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] md:block">
            <table className="w-full min-w-[1120px] border-collapse text-sm">
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
                    "Source",
                    "Blocker",
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
                  return (
                    <tr
                      key={`${item.kind}:${item.id}`}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)] focus-within:bg-[var(--surface-hover)]"
                    >
                      <td className="px-3 py-3">
                        {item.kind === "task" ? (
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.title}`}
                            checked={selected.has(item.id)}
                            onChange={() => toggle(item.id)}
                          />
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        {title(item.priority)}
                      </td>
                      <td className="max-w-[280px] px-3 py-3">
                        <div className="font-medium">{item.title}</div>
                        {item.description ? (
                          <div className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
                            {item.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        {item.objectHref ? (
                          <Link
                            className="font-medium underline underline-offset-2"
                            href={`${item.objectHref}${item.objectHref.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(`/work?view=${view}`)}`}
                          >
                            {item.objectLabel}
                          </Link>
                        ) : (
                          item.objectLabel
                        )}
                      </td>
                      <td className="px-3 py-3">{title(item.status)}</td>
                      <td className="px-3 py-3">
                        {item.ownerUserId ? "Assigned" : title(item.ownerRole)}
                      </td>
                      <td className="px-3 py-3">{title(item.source)}</td>
                      <td className="max-w-[200px] px-3 py-3 text-xs text-[var(--text-secondary)]">
                        {item.blockingReason ?? "—"}
                      </td>
                      <td className={`px-3 py-3 text-xs ${due.className}`}>
                        {due.label}
                      </td>
                      <td className="px-3 py-3">
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
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                          {title(item.priority)} · {title(item.status)}
                        </p>
                        <h3 className="mt-1 font-semibold">{item.title}</h3>
                      </div>
                    </div>
                    <span className={`text-xs ${due.className}`}>
                      {due.label}
                    </span>
                  </div>
                  {item.description ? (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                    <span>
                      {item.objectHref ? (
                        <Link
                          className="underline"
                          href={`${item.objectHref}${item.objectHref.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(`/work?view=${view}`)}`}
                        >
                          {item.objectLabel}
                        </Link>
                      ) : (
                        item.objectLabel
                      )}
                    </span>
                    <span>
                      {item.ownerUserId ? "Assigned" : title(item.ownerRole)}
                    </span>
                    <span>{title(item.source)}</span>
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
        Showing {items.length} of {total} matching items. Results are server
        filtered and paginated.
      </p>
    </section>
  );
}
