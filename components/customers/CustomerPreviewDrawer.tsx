"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, CircleDollarSign, ReceiptText, ShieldCheck, TriangleAlert } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrencyNullable, formatDate, formatDateAbsolute } from "@/lib/utils/format";

type Preview = {
  customer: {
    id: string;
    name: string;
    email: string | null;
    asOf: string | null;
    firstSeen: string | null;
    lastOrderAt: string | null;
    stats: { orders: number; payoutCases: number; caseRate: number; chargebacks: number };
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
    openExposureByCurrency: Array<{ currency: string; value: number }>;
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
      caseCount: number;
      caseType: string | null;
      caseState: string | null;
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
              className="flex-1 rounded-md bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-[var(--accent-fg-on-500)]"
              href={`/customers/${customer.id}?return=${encodeURIComponent(returnUrl)}`}
            >
              Open full profile
            </Link>
            {customer.openCases.length === 1 ? <Link className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold" href={customer.openCases[0].href}>Open case</Link> : null}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-5 p-5" aria-live="polite">
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
            <div className="rounded-lg border border-[var(--border-muted)] bg-[var(--surface-sunken)] p-4">
              <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-sm font-semibold text-[var(--text-primary)] ring-1 ring-[var(--border)]">
                {customer.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{customer.email ?? "Contact unavailable"}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Customer since {customer.firstSeen ? formatDateAbsolute(customer.firstSeen) : 'date unavailable'}</p>
              </div>
              {customer.openCases.length ? <Badge tone="warning" size="sm" dot>{customer.openCases.length} open</Badge> : <Badge tone="success" size="sm" dot>No open cases</Badge>}
              </div>
              <p className="mt-3 border-t border-[var(--border-muted)] pt-3 text-xs leading-5 text-[var(--text-secondary)]">
                {customer.stats.orders === 0
                  ? "No store orders are linked to this customer yet."
                  : `${customer.stats.orders} store order${customer.stats.orders === 1 ? '' : 's'}${customer.lastOrderAt ? `, most recently ${formatDate(customer.lastOrderAt)}` : ''}. ${customer.stats.payoutCases === 0 ? 'No payout case history.' : `${customer.stats.payoutCases} payout case${customer.stats.payoutCases === 1 ? '' : 's'} across their order history.`}`}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Orders', customer.stats.orders],
                ['Case history', customer.stats.payoutCases],
                ['Case rate', `${customer.stats.caseRate}%`],
                ['Chargebacks', customer.stats.chargebacks],
              ].map(([name, value]) => <div key={name} className="min-w-0 rounded-md border border-[var(--border-muted)] bg-[var(--surface)] p-3"><dt className="truncate text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{name}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd></div>)}
            </dl>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" /><h3 className="font-semibold">Store financials</h3></div>
              {customer.totalsByCurrency.length ? (
                <dl className="mt-3 space-y-3">
                  {customer.totalsByCurrency.map((total) => (
                    <div
                      key={total.currency}
                      className="flex justify-between gap-4"
                    >
                      <dt className="text-sm text-[var(--text-secondary)]">
                        Lifetime order value<br /><span className="text-xs">{total.orders} orders · {amount(total.value / Math.max(total.orders, 1), total.currency)} average</span>
                      </dt>
                      <dd className="font-semibold tabular-nums">
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
              {customer.openExposureByCurrency.length ? (
                <div className="mt-3 border-t border-[var(--border-muted)] pt-3">
                  {customer.openExposureByCurrency.map((item) => <div key={item.currency} className="flex items-center justify-between gap-3 text-sm"><span className="inline-flex items-center gap-1.5 text-[var(--warning)]"><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> Open case exposure</span><strong className="tabular-nums">{amount(item.value, item.currency)}</strong></div>)}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" /><h3 className="font-semibold">Payout cases requiring attention</h3></div>{customer.openCases.length ? <Badge tone="warning" size="sm">Action needed</Badge> : null}</div>
              {customer.openCases.length ? (
                <ul className="mt-2 divide-y divide-[var(--border-muted)]">
                  {customer.openCases.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-3 py-3 hover:text-[var(--accent)]"
                      >
                        <span>
                          {item.reference}
                          <small className="mt-1 block"><StatusBadge family="caseStatus" value={item.state} size="sm" /></small>
                        </span>
                        <span className="inline-flex items-center gap-2 font-medium">{amount(item.amount, item.currency)}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Nothing needs attention. This customer has no open payout cases.
                </p>
              )}
            </section>

            <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" /><h3 className="font-semibold">Recent store activity</h3></div>
              {customer.recent.length ? (
                <ul className="mt-2 divide-y divide-[var(--border-muted)]">
                  {customer.recent.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <span className="min-w-0">
                          <span className="font-medium">Order {item.reference}</span>
                          <small className="mt-0.5 block text-[var(--text-secondary)]">
                            {formatDate(item.at)}
                          </small>
                          {item.caseState ? <small className="mt-1 block"><StatusBadge family="caseStatus" value={item.caseState} size="sm" /></small> : null}
                        </span>
                        <span className="text-right"><strong className="block tabular-nums">{amount(item.amount, item.currency)}</strong>{item.caseType ? <small className="mt-1 block text-[var(--text-secondary)]">{item.caseType}</small> : <small className="mt-1 block text-[var(--text-tertiary)]">No payout case</small>}</span>
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
