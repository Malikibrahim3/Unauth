"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrencyNullable, formatDate, formatDateAbsolute } from "@/lib/utils/format";

type Preview = {
  customer: {
    id: string;
    name: string;
    email: string | null;
    asOf: string | null;
    firstSeen: string | null;
    stats: { orders: number; payoutCases: number; refundRate: number; chargebacks: number };
    sources: Array<{
      provider: string;
      externalId: string;
      verified: boolean | null;
      asOf: string;
    }>;
    totalsByCurrency: Array<{
      currency: string;
      orders: number;
      value: number;
    }>;
    unavailableCurrencyOrders: number;
    attention: Array<{ text: string; href: string }>;
    openCases: Array<{
      id: string;
      reference: string;
      state: string;
      amount: number | null;
      currency: string | null;
      href: string;
    }>;
    recent: Array<{
      type: string;
      reference: string;
      amount: number | null;
      currency: string | null;
      at: string;
      href: string;
    }>;
  };
};

function amount(value: number | null, currency: string | null) {
  return value == null || !currency
    ? "Amount unavailable"
    : formatCurrencyNullable(value, currency);
}

export function CustomerPreviewDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  const [state, setState] = useState<{
    loading: boolean;
    data?: Preview;
    error?: string;
  }>({ loading: false });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!id) {
      setState({ loading: false });
      return;
    }

    const controller = new AbortController();
    setState({ loading: true });
    fetch(`/api/customers/${id}/preview`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Preview unavailable");
        return body as Preview;
      })
      .then((data) => setState({ loading: false, data }))
      .catch((error: Error & { name?: string }) => {
        if (error.name !== "AbortError") {
          setState({ loading: false, error: error.message });
        }
      });

    return () => controller.abort();
  }, [id, retryKey]);

  const customer = state.data?.customer;
  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return "/customers";
    return `${window.location.pathname}${window.location.search}`;
  }, []);

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={
        customer?.name ??
        (state.loading ? "Loading customer…" : "Customer preview")
      }
      aria-label="Customer preview"
      footer={
        customer ? (
          <div className="flex w-full gap-2 p-4">
            <Link
              className="flex-1 rounded-md bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-white"
              href={`/customers/${customer.id}?return=${encodeURIComponent(returnUrl)}`}
            >
              Open full profile
            </Link>
            {customer.openCases.length === 1 ? <Link className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold" href={customer.openCases[0].href}>Open case</Link> : null}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6 p-5" aria-live="polite">
        {state.loading ? (
          <div
            role="status"
            className="space-y-3"
            aria-label="Loading customer preview"
          >
            <div className="h-5 w-2/3 animate-pulse bg-[var(--bg-subtle)]" />
            <div className="h-20 animate-pulse bg-[var(--bg-subtle)]" />
            <div className="h-32 animate-pulse bg-[var(--bg-subtle)]" />
          </div>
        ) : null}

        {state.error ? (
          <div role="alert">
            <p className="font-semibold">{state.error}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              The customer may have been merged, deleted, or you may no longer
              have access.
            </p>
            <button
              type="button"
              className="mt-3 font-semibold text-[var(--accent)]"
              onClick={() => setRetryKey((value) => value + 1)}
            >
              Retry preview
            </button>
          </div>
        ) : null}

        {customer ? (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-sm font-semibold text-[var(--text-primary)]">
                {customer.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C'}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm">{customer.email ?? "Contact unavailable"}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">First seen {customer.firstSeen ? formatDateAbsolute(customer.firstSeen) : 'date unavailable'}</p>
              </div>
            </div>

            <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-md border border-[var(--border)] bg-[var(--border)]">
              {[
                ['Orders', customer.stats.orders],
                ['Payout cases', customer.stats.payoutCases],
                ['Refund rate', `${customer.stats.refundRate}%`],
                ['Chargebacks', customer.stats.chargebacks],
              ].map(([name, value]) => <div key={name} className="min-w-0 bg-[var(--surface)] p-2 text-center"><dt className="truncate text-[10px] text-[var(--text-tertiary)]">{name}</dt><dd className="mt-1 text-sm font-semibold tabular-nums">{value}</dd></div>)}
            </dl>

            <section>
              <h3 className="font-semibold">Order value</h3>
              {customer.totalsByCurrency.length ? (
                <dl className="mt-2 space-y-2">
                  {customer.totalsByCurrency.map((total) => (
                    <div
                      key={total.currency}
                      className="flex justify-between gap-4"
                    >
                      <dt>
                        {total.orders} orders · {total.currency}
                      </dt>
                      <dd className="tabular-nums">
                        {amount(total.value, total.currency)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  No currency-qualified order totals were found.
                </p>
              )}
              {customer.unavailableCurrencyOrders > 0 ? (
                <p className="mt-2 text-xs text-[var(--warning)]">
                  {customer.unavailableCurrencyOrders} order
                  {customer.unavailableCurrencyOrders === 1 ? "" : "s"} excluded
                  because currency is unavailable.
                </p>
              ) : null}
            </section>

            <section>
              <h3 className="font-semibold">Open cases</h3>
              {customer.openCases.length ? (
                <ul className="mt-2 divide-y divide-[var(--border-muted)]">
                  {customer.openCases.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex justify-between gap-3 py-3"
                      >
                        <span>
                          {item.reference}
                          <small className="mt-1 block"><StatusBadge family="caseStatus" value={item.state} size="sm" /></small>
                        </span>
                        <span>{amount(item.amount, item.currency)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  No payout cases were found.
                </p>
              )}
            </section>

            <section>
              <h3 className="font-semibold">Recent orders</h3>
              {customer.recent.length ? (
                <ul className="mt-2 divide-y divide-[var(--border-muted)]">
                  {customer.recent.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex justify-between gap-3 py-3"
                      >
                        <span>
                          {item.type} {item.reference}
                          <small className="block text-[var(--text-secondary)]">
                            {formatDate(item.at)}
                          </small>
                        </span>
                        <span>{amount(item.amount, item.currency)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  No recent activity was found.
                </p>
              )}
            </section>

          </>
        ) : null}
      </div>
    </Drawer>
  );
}
