"use client";

import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import type {
  OrderOption,
  PackageIncludeItem,
  PriorMatchPreview,
} from "@/components/evidence/evidencePackageFormTypes";
import { formatDateAbsolute } from "@/lib/utils/format";

type EvidencePackageFormFieldsProps = {
  profileId: string;
  orders: OrderOption[];
  selectedOrderId: string;
  notes: string;
  loading: boolean;
  error: string;
  priorMatchPreview: PriorMatchPreview;
  priorMatchChecking: boolean;
  packageIncludes: PackageIncludeItem[];
  canSubmit: boolean;
  onOrderChange: (orderId: string) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel?: () => void;
};

function PriorMatchPreviewBanner({
  priorMatchChecking,
  priorMatchPreview,
}: {
  priorMatchChecking: boolean;
  priorMatchPreview: PriorMatchPreview;
}) {
  if (priorMatchChecking) {
    return (
      <div
        className="flex items-center gap-2 rounded-md p-3"
        style={{
          background: "var(--ua-surface-secondary)",
          border: "1px solid var(--ua-border-subtle)",
        }}
      >
        <Spinner size="sm" delayMs={0} label="Checking for prior identity matches" />
        <p className="text-caption" style={{ color: "var(--ua-text-secondary)" }}>
          Checking for prior identity matches…
        </p>
      </div>
    );
  }

  if (priorMatchPreview === "likely") {
    return (
      <div
        className="flex items-start gap-2.5 rounded-md p-3"
        style={{
          background: "var(--ua-success-bg)",
          border: "1px solid var(--ua-success-border)",
        }}
      >
        <span style={{ color: "var(--ua-success)" }}>✓</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--ua-text-primary)" }}>
            Prior matching transactions found
          </p>
          <p
            className="text-caption mt-0.5"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            This customer has prior orders in your records that share identity
            signals with the selected order.
          </p>
        </div>
      </div>
    );
  }

  if (priorMatchPreview === "unlikely") {
    return (
      <div
        className="flex items-start gap-2.5 rounded-md p-3"
        style={{
          background: "var(--ua-warning-bg)",
          border: "1px solid var(--ua-warning-border)",
        }}
      >
        <span style={{ color: "var(--ua-warning)" }}>⚠</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--ua-text-primary)" }}>
            No prior matching transactions detected
          </p>
          <p
            className="text-caption mt-0.5"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            No prior transactions with matching signals were found in your
            records for this customer.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export function EvidencePackageFormFields({
  profileId,
  orders,
  selectedOrderId,
  notes,
  loading,
  error,
  priorMatchPreview,
  priorMatchChecking,
  packageIncludes,
  canSubmit,
  onOrderChange,
  onNotesChange,
  onSubmit,
  onCancel,
}: EvidencePackageFormFieldsProps) {
  const cancelControl = onCancel ? (
    <button
      type="button"
      onClick={onCancel}
      className="text-xs hover:underline"
      style={{ color: "var(--ua-text-secondary)" }}
    >
      Cancel
    </button>
  ) : (
    <Link
      href={`/customers/${profileId}`}
      className="text-xs hover:underline"
      style={{ color: "var(--ua-text-secondary)" }}
    >
      Cancel
    </Link>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label
          className="mb-2 block text-xs font-semibold"
          style={{ color: "var(--ua-text-secondary)" }}
          htmlFor="order-select"
        >
          Disputed order *
        </label>
        <select
          id="order-select"
          data-testid="disputed-order-select"
          value={selectedOrderId}
          onChange={(e) => onOrderChange(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-sm"
          style={{
            background: "var(--ua-surface-secondary)",
            border: "1px solid var(--ua-border-default)",
            color: "var(--ua-text-primary)",
          }}
          required
        >
          <option value="">Select an order to defend…</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {o.order_id} · {formatDateAbsolute(new Date(o.processed_at))}
              {o.order_value != null ? ` · ${o.order_value.toFixed(2)}` : ""}
              {o.refund_claimed ? " ★ refund claimed" : ""}
            </option>
          ))}
        </select>
        {!selectedOrderId ? (
          <p
            className="text-caption mt-1.5"
            style={{ color: "var(--ua-text-tertiary)" }}
          >
            Select the order the customer has disputed. Orders marked ★ have a
            refund claim on record.
          </p>
        ) : null}
      </div>

      {selectedOrderId ? (
        <div>
          <PriorMatchPreviewBanner
            priorMatchChecking={priorMatchChecking}
            priorMatchPreview={priorMatchPreview}
          />
        </div>
      ) : null}

      {selectedOrderId ? (
        <div
          className="rounded-md p-5"
          style={{
            background: "var(--ua-surface-secondary)",
            border: "1px solid var(--ua-border-subtle)",
          }}
        >
          <p
            className="mb-3 text-xs font-semibold"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            This package will include
          </p>
          <ul className="space-y-1.5">
            {packageIncludes.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 text-caption"
              >
                {item.pending ? (
                  <span style={{ color: "var(--ua-text-tertiary)" }}>○</span>
                ) : item.available ? (
                  <span style={{ color: "var(--ua-success)" }}>✓</span>
                ) : (
                  <span style={{ color: "var(--ua-border-default)" }}>–</span>
                )}
                <span
                  style={{
                    color: item.available
                      ? "var(--ua-text-primary)"
                      : "var(--ua-text-tertiary)",
                  }}
                >
                  {item.label}
                  {item.optional && !item.available ? (
                    <span
                      className="ml-1"
                      style={{ color: "var(--ua-text-tertiary)" }}
                    >
                      (add notes below)
                    </span>
                  ) : null}
                  {item.pending ? (
                    <span
                      className="ml-1"
                      style={{ color: "var(--ua-text-tertiary)" }}
                    >
                      (checking…)
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <label
          className="mb-2 block text-xs font-semibold"
          style={{ color: "var(--ua-text-secondary)" }}
          htmlFor="notes"
        >
          Merchant note{" "}
          <span
            className="font-normal"
            style={{ color: "var(--ua-text-tertiary)" }}
          >
            (optional · appears in the package · max 500 characters)
          </span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Any additional context to include in the evidence package…"
          className="w-full resize-none rounded-md px-3 py-2 text-sm"
          style={{
            background: "var(--ua-surface-secondary)",
            border: "1px solid var(--ua-border-default)",
            color: "var(--ua-text-primary)",
          }}
        />
        <p
          className="text-caption mt-1 text-right"
          style={{ color: "var(--ua-text-tertiary)" }}
        >
          {notes.length}/500
        </p>
      </div>

      {error ? (
        <div
          className="rounded-md border p-3 text-sm"
          style={{
            background: "var(--ua-risk-critical-bg)",
            borderColor: "var(--ua-risk-critical-border)",
            color: "var(--ua-risk-critical)",
          }}
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-2">
        {cancelControl}
        <div className="flex flex-col items-end gap-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--ua-action-primary)", color: "var(--ua-text-inverse)" }}
          >
            {loading ? "Building…" : "Build evidence package"}
          </button>
          {!selectedOrderId ? (
            <p className="text-xs" style={{ color: "var(--ua-text-tertiary)" }}>
              Select an order above to continue
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
