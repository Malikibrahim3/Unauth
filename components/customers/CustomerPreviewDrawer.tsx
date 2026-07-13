"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { formatCurrencyNullable, formatDateTime } from "@/lib/utils/format";

type Preview = {
  customer: {
    id: string;
    name: string;
    email: string | null;
    asOf: string | null;
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
          <div className="flex gap-3 p-4">
            <Link
              className="font-semibold text-[var(--accent)]"
              href={`/customers/${customer.id}?return=${encodeURIComponent(returnUrl)}`}
            >
              Open full customer profile
            </Link>
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
            <div>
              <p className="break-all text-sm">
                {customer.email ?? "Contact restricted or unavailable"}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Customer ID{" "}
                <span className="break-all font-mono">{customer.id}</span>
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Fresh as of{" "}
                {customer.asOf
                  ? formatDateTime(customer.asOf)
                  : "unknown"}
              </p>
            </div>

            {customer.attention.length ? (
              <section>
                <h3 className="font-semibold">Needs attention</h3>
                <ul className="mt-2 space-y-2">
                  {customer.attention.map((item) => (
                    <li key={`${item.href}:${item.text}`}>
                      <Link className="text-[var(--accent)]" href={item.href}>
                        {item.text} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="font-semibold">Financial and customer summary</h3>
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
              <h3 className="font-semibold">Open work and cases</h3>
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
                          <small className="block text-[var(--text-secondary)]">
                            {item.state}
                          </small>
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
              <h3 className="font-semibold">Recent connected records</h3>
              {customer.recent.length ? (
                <ul className="mt-2 divide-y divide-[var(--border-muted)]">
                  {customer.recent.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex justify-between gap-3 py-3"
                      >
                        <span className="capitalize">
                          {item.type} {item.reference}
                          <small className="block text-[var(--text-secondary)]">
                            {formatDateTime(item.at)}
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

            <section>
              <h3 className="font-semibold">Source identities</h3>
              <ul className="mt-2 space-y-2">
                {customer.sources.map((source) => (
                  <li
                    key={`${source.provider}:${source.externalId}`}
                    className="text-sm"
                  >
                    <span className="font-medium">{source.provider}</span> ·{" "}
                    <span className="break-all font-mono">
                      {source.externalId}
                    </span>
                    <small className="block text-[var(--text-secondary)]">
                      {source.verified
                        ? "Verified contact"
                        : "Contact not verified"}{" "}
                      · synced{" "}
                      {formatDateTime(source.asOf)}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    </Drawer>
  );
}
