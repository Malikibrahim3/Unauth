"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Modal,
  PanelCard,
} from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CaseContextDrawer } from "@/components/cases/CaseContextDrawer";
import { formatCurrencyNullable, formatDate } from "@/lib/utils/format";
import { recoverySoughtAmount } from "@/lib/recoveries/amounts";
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
  | "rejected"
  | "paid"
  | "closed_unrecoverable";

const ACTIONS: Array<{
  action: RecoveryAction;
  label: string;
  statuses: RecoveryCase["status"][];
  confirm?: boolean;
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
  },
  {
    action: "rejected",
    label: "Record rejected",
    statuses: ["submitted", "waiting_response", "chase_due"],
  },
  {
    action: "paid",
    label: "Record paid",
    statuses: ["approved", "partially_approved"],
    confirm: true,
  },
  {
    action: "closed_unrecoverable",
    label: "Close unrecoverable",
    statuses: ["draft", "evidence_needed", "rejected", "appealed"],
    confirm: true,
  },
];

function dateLabel(value: string | null) {
  return value ? formatDate(value) : "No date";
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
  } | null>(null);

  async function runAction(
    item: RecoveryCase,
    option: (typeof ACTIONS)[number],
  ) {
    if (option.confirm && pending == null) {
      setPending({ item, option });
      return;
    }
    setBusyId(`${item.id}:${option.action}`);
    setMessage(null);
    try {
      const response = await fetch(`/api/recoveries/${item.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: option.action,
          idempotencyKey: `${item.id}:${option.action}:${crypto.randomUUID()}`,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Recovery action failed");
      setRowOverrides((current) => ({
        ...current,
        [item.id]: body.recoveryCase,
      }));
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
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/recoveries/${item.id}`}
                              className="block truncate text-xs font-semibold no-underline hover:underline"
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
                        {canManage ? (
                          <div
                            className="mt-3 flex flex-wrap gap-1.5 border-t pt-3"
                            style={{ borderColor: "var(--border-muted)" }}
                          >
                            {ACTIONS.filter((option) =>
                              option.statuses.includes(item.status),
                            ).map((option) => (
                              <button
                                key={option.action}
                                type="button"
                                className="rounded-md px-2 py-1 text-[11px] font-medium"
                                style={{
                                  border: "1px solid var(--border-muted)",
                                  color: "var(--text-secondary)",
                                }}
                                disabled={
                                  busyId === `${item.id}:${option.action}`
                                }
                                onClick={() => runAction(item, option)}
                              >
                                {busyId === `${item.id}:${option.action}`
                                  ? "Saving…"
                                  : option.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
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
        description="This records an immutable recovery activity event."
        actions={
          pending
            ? [
                {
                  label: pending.option.label,
                  variant:
                    pending.option.action === "closed_unrecoverable"
                      ? "danger"
                      : "primary",
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
                    recoverySoughtAmount(pending.item),
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
                    pending.item.amount_recovered,
                    pending.item.currency,
                  ) ?? "—")
                : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-[var(--text-secondary)]">
          Closing unrecoverable does not delete prior evidence, correspondence,
          or financial activity.
        </p>
      </Modal>
    </div>
  );
}
