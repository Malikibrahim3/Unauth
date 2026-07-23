"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Modal,
  PanelCard,
} from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";
import { CaseContextDrawer } from "@/components/cases/CaseContextDrawer";
import { formatCurrencyNullable, formatDate } from "@/lib/utils/format";
import { RECOVERY_TYPE_LABELS } from "@/lib/partners/types";
import {
  RECOVERY_OWNER_LABELS,
  type RecoveryCase,
} from "@/lib/recoveries/types";
import { RECOVERY_BOARD_COLUMNS } from "@/lib/recoveries/status";

type Props = {
  recoveries: RecoveryCase[];
  canManage: boolean;
};

type RecoveryAction =
  | "ready"
  | "submitted"
  | "chased"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "appealed"
  | "paid"
  | "closed_unrecoverable";

const ACTIONS: Array<{
  action: RecoveryAction;
  label: string;
  statuses: RecoveryCase["status"][];
  confirm?: boolean;
  requiresNote?: boolean;
  amountKind?: "approved" | "received";
}> = [
  {
    action: "ready",
    label: "Mark ready",
    statuses: ["draft", "evidence_needed"],
  },
  {
    action: "submitted",
    label: "Mark submitted",
    statuses: ["ready_to_submit"],
    confirm: true,
    requiresNote: true,
  },
  {
    action: "chased",
    label: "Record chase",
    statuses: ["submitted", "waiting_response", "chase_due"],
  },
  {
    action: "approved",
    label: "Record approved",
    statuses: ["submitted", "waiting_response", "chase_due"],
    confirm: true,
    amountKind: "approved",
  },
  {
    action: "partially_approved",
    label: "Record partial approval",
    statuses: ["submitted", "waiting_response", "chase_due"],
    confirm: true,
    amountKind: "approved",
  },
  {
    action: "rejected",
    label: "Record rejected",
    statuses: ["submitted", "waiting_response", "chase_due"],
    confirm: true,
    requiresNote: true,
  },
  {
    action: "appealed",
    label: "Record appeal",
    statuses: ["rejected"],
    confirm: true,
    requiresNote: true,
  },
  {
    action: "paid",
    label: "Record paid",
    statuses: ["approved", "partially_approved"],
    confirm: true,
    amountKind: "received",
  },
  {
    action: "closed_unrecoverable",
    label: "Close unrecoverable",
    statuses: ["draft", "evidence_needed", "rejected", "appealed"],
    confirm: true,
    requiresNote: true,
  },
];

function dateLabel(value: string | null) {
  return value ? formatDate(value) : "No date";
}

function actionDescription(action: RecoveryAction | undefined): string {
  if (action === "approved" || action === "partially_approved") {
    return "Records the source-approved amount. Approval is not recorded as recovered cash.";
  }
  if (action === "paid") return "Records the cumulative amount actually received or credited back to the merchant.";
  if (action === "closed_unrecoverable") return "Records the remaining pursued amount as written off; it is not money recovered.";
  if (action === "submitted") return "Records that a merchant submitted externally. Unauth does not send the claim or correspondence.";
  return "This records an immutable recovery activity event.";
}

export function RecoveryBoardClient({ recoveries, canManage }: Props) {
  const [rowOverrides, setRowOverrides] = useState<
    Record<string, RecoveryCase>
  >({});
  const rowsState = recoveries.map((row) => rowOverrides[row.id] ?? row);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [contextCaseId, setContextCaseId] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    item: RecoveryCase;
    option: (typeof ACTIONS)[number];
    note: string;
    amount: string;
    idempotencyKey: string;
  } | null>(null);
  const retryKeysRef = useRef<Record<string, string>>({});

  async function runAction(
    item: RecoveryCase,
    option: (typeof ACTIONS)[number],
  ) {
    if (option.confirm && pending == null) {
      const retryScope = `${item.id}:${option.action}`;
      const idempotencyKey = retryKeysRef.current[retryScope]
        ?? `${retryScope}:${crypto.randomUUID()}`;
      retryKeysRef.current[retryScope] = idempotencyKey;
      const defaultAmount = option.amountKind === "approved"
        ? String(item.amount_sought_minor / 100)
        : "";
      setPending({ item, option, note: "", amount: defaultAmount, idempotencyKey });
      return;
    }
    const active = pending?.item.id === item.id && pending.option.action === option.action
      ? pending
      : null;
    const retryScope = `${item.id}:${option.action}`;
    const idempotencyKey = active?.idempotencyKey
      ?? retryKeysRef.current[retryScope]
      ?? `${retryScope}:${crypto.randomUUID()}`;
    retryKeysRef.current[retryScope] = idempotencyKey;
    const amountMajor = active?.amount ? Number(active.amount) : null;
    setBusyId(`${item.id}:${option.action}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/recoveries/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: option.action,
          note: active?.note.trim() || undefined,
          amountMinor: option.amountKind && amountMajor != null && Number.isFinite(amountMajor)
            ? Math.round(amountMajor * 100)
            : undefined,
          idempotencyKey,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Recovery action failed");
      setRowOverrides((current) => ({
        ...current,
        [item.id]: body.recoveryCase,
      }));
      delete retryKeysRef.current[retryScope];
      setPending(null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Recovery action failed",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
        Cards update automatically as your connected tools sync new evidence and
        status.
      </p>
      {message ? (
        <p
          role="alert"
          className="mb-3 text-xs"
          style={{ color: "var(--danger)" }}
        >
          {message}
        </p>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-5">
        {RECOVERY_BOARD_COLUMNS.map((column) => {
          const rows = rowsState.filter((item) =>
            column.statuses.includes(item.status),
          );
          return (
            <PanelCard
              as="section"
              variant="app"
              key={column.key}
              className="min-w-0 overflow-hidden p-0"
            >
              <div
                className="flex items-center justify-between gap-3 border-b px-3 py-2"
                style={{ borderColor: "var(--border-muted)" }}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {column.label}
                </p>
                <Badge size="sm">{rows.length}</Badge>
              </div>
              <div className="space-y-2 p-2">
                {rows.length === 0 ? (
                  <p
                    className="px-2 py-6 text-center text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    No cases
                  </p>
                ) : (
                  rows.map((item) => {
                    const orderLabel =
                      item.support_payout_case?.order_number ??
                      item.support_payout_case?.ticket_external_id ??
                      item.support_payout_case_id.slice(0, 8);
                    return (
                      <PanelCard
                        as="article"
                        key={item.id}
                        variant="appInset"
                        className="p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                          <div className="min-w-0">
                            <Link
                              href={`/recoveries/${item.id}`}
                              className="block whitespace-nowrap text-xs font-semibold no-underline hover:underline"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {orderLabel}
                            </Link>
                            <p
                              className="mt-0.5 text-[11px]"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {RECOVERY_TYPE_LABELS[item.recovery_type]} ·{" "}
                              {RECOVERY_OWNER_LABELS[item.owner_type]}
                            </p>
                          </div>
                          <StatusBadge family="recoveryStatus" value={item.status} size="sm" className="shrink-0" />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p style={{ color: "var(--text-tertiary)" }}>
                              Loss
                            </p>
                            <p
                              className="font-mono"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {formatCurrencyNullable(
                                item.merchant_loss_amount,
                                item.currency,
                              ) ?? "-"}
                            </p>
                          </div>
                          <div>
                            <p style={{ color: "var(--text-tertiary)" }}>
                              Recoverable
                            </p>
                            <p
                              className="font-mono"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {formatCurrencyNullable(
                                item.estimated_recoverable_max,
                                item.currency,
                              ) ?? "-"}
                            </p>
                          </div>
                          <div>
                            <p style={{ color: "var(--text-tertiary)" }}>
                              Deadline
                            </p>
                            <p style={{ color: "var(--text-primary)" }}>
                              {dateLabel(item.deadline_at)}
                            </p>
                          </div>
                          <div>
                            <p style={{ color: "var(--text-tertiary)" }}>
                              Last source update
                            </p>
                            <p style={{ color: "var(--text-primary)" }}>
                              {dateLabel(item.updated_at)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <Badge tone={item.evidence_complete ? "success" : "warning"} size="sm" dot>
                            {item.evidence_complete
                              ? "Evidence complete"
                              : `${item.evidence_missing.length} evidence missing`}
                          </Badge>
                          {item.partner?.name ? (
                            <Badge size="sm">{item.partner.name}</Badge>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              setContextCaseId(item.support_payout_case_id)
                            }
                            className="rounded-md px-2 py-0.5 text-[11px]"
                            style={{
                              border: "1px solid var(--border-muted)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Case context
                          </button>
                        </div>
                        {canManage
                          ? (() => {
                              const applicable = ACTIONS.filter((option) =>
                                option.statuses.includes(item.status),
                              );
                              if (applicable.length === 0) return null;
                              const [primary, ...rest] = applicable;
                              const isDanger = (a: RecoveryAction) =>
                                a === "closed_unrecoverable" || a === "rejected";
                              const primaryBusy =
                                busyId === `${item.id}:${primary.action}`;
                              return (
                                <div
                                  className="mt-3 flex items-center gap-1.5 border-t pt-3"
                                  style={{ borderColor: "var(--border-muted)" }}
                                >
                                  <button
                                    type="button"
                                    className="rounded-md px-2.5 py-1 text-[11px] font-medium"
                                    style={{
                                      border: "1px solid var(--border-muted)",
                                      color: isDanger(primary.action)
                                        ? "var(--risk-critical-fg)"
                                        : "var(--text-secondary)",
                                    }}
                                    disabled={primaryBusy}
                                    onClick={() => runAction(item, primary)}
                                  >
                                    {primaryBusy ? "Saving…" : primary.label}
                                  </button>
                                  {rest.length > 0 ? (
                                    <RowActionsMenu
                                      label="More recovery actions"
                                      actions={rest.map((option) => ({
                                        label: option.label,
                                        tone: isDanger(option.action)
                                          ? "danger"
                                          : "default",
                                        disabled:
                                          busyId ===
                                          `${item.id}:${option.action}`,
                                        onSelect: () => runAction(item, option),
                                      }))}
                                    />
                                  ) : null}
                                </div>
                              );
                            })()
                          : null}
                      </PanelCard>
                    );
                  })
                )}
              </div>
            </PanelCard>
          );
        })}
      </div>
      {contextCaseId ? (
        <CaseContextDrawer
          caseId={contextCaseId}
          onClose={() => setContextCaseId(null)}
        />
      ) : null}
      <Modal
        open={pending != null}
        onClose={() => setPending(null)}
        title={pending?.option.label ?? "Confirm recovery action"}
        description={actionDescription(pending?.option.action)}
        actions={
          pending
            ? [
                {
                  label: pending.option.label,
                  variant:
                    pending.option.action === "closed_unrecoverable"
                      ? "danger"
                      : "primary",
                  disabled:
                    (pending.option.requiresNote && pending.note.trim().length < 3)
                    || (Boolean(pending.option.amountKind)
                      && (!Number.isFinite(Number(pending.amount)) || Number(pending.amount) < 0)),
                  onClick: () =>
                    void runAction(pending.item, {
                      ...pending.option,
                      confirm: false,
                    }),
                },
              ]
            : []
        }
      >
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Amount pursued</dt>
            <dd className="font-mono">
              {pending
                ? (formatCurrencyNullable(
                    pending.item.amount_sought_minor / 100,
                    pending.item.currency,
                  ) ?? "—")
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Recovered</dt>
            <dd className="font-mono">
              {pending
                ? (formatCurrencyNullable(
                    pending.item.amount_recovered_minor / 100,
                    pending.item.currency,
                  ) ?? "—")
                : "—"}
            </dd>
          </div>
        </dl>
        {pending?.option.amountKind ? (
          <label className="mt-4 block text-xs font-medium text-[var(--text-secondary)]">
            {pending.option.amountKind === "approved" ? "Approved amount" : "Cumulative amount received"}
            <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
              <input
                type="number"
                min={0}
                step="0.01"
                value={pending.amount}
                onChange={(event) => setPending({ ...pending, amount: event.target.value })}
                className="rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus-visible:shadow-[var(--shadow-focus)]"
              />
              <span className="flex items-center rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] px-3 font-semibold">
                {pending.item.currency}
              </span>
            </div>
          </label>
        ) : null}
        {pending?.option.requiresNote ? (
          <label className="mt-4 block text-xs font-medium text-[var(--text-secondary)]">
            Reason
            <textarea
              value={pending.note}
              onChange={(event) => setPending({ ...pending, note: event.target.value })}
              className="mt-1 min-h-20 w-full rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus-visible:shadow-[var(--shadow-focus)]"
              placeholder="Record the source reference or reason"
            />
          </label>
        ) : null}
        <p className="mt-4 text-xs text-[var(--text-secondary)]">
          Closing unrecoverable does not delete prior evidence, correspondence,
          or financial activity.
        </p>
      </Modal>
    </div>
  );
}
