"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, ReceiptText, ShieldCheck, TriangleAlert } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Bone } from "@/components/ui/LoadingSkeleton";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrencyNullable, formatDate, formatDateAbsolute } from "@/lib/utils/format";
import { providerLabel } from "@/lib/ui/merchantCopy";

type Preview = {
  customer: {
    id: string;
    name: string;
    email: string | null;
    asOf: string | null;
    firstSeen: string | null;
    lastOrderAt: string | null;
    stats: {
      orders: number;
      payoutCases: number;
      caseRate: number;
      chargebacks: number;
      possibleMatchCount?: number;
    };
    identitySignalCounts?: Array<{ type: string; distinctCount: number }>;
    possibleMatches?: Array<{
      candidateId: string;
      displayName?: string | null;
      email?: string | null;
      confidence: number | null;
      matchedTypes: string[];
    }>;
    sources: Array<{
      provider: string;
      externalId: string;
      email?: string | null;
      phone?: string | null;
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
      externalHref?: string | null;
      externalSource?: string | null;
      caseCount: number;
      caseType: string | null;
      caseState: string | null;
      lineItems?: Array<{ title: string; quantity: number | null }>;
      shipmentStatus?: string | null;
      shipmentCarrier?: string | null;
      shipmentHref?: string | null;
      shipmentSource?: string | null;
    }>;
  };
};

function amount(value: number | null, currency: string | null) {
  return value == null || !currency
    ? "Amount unavailable"
    : formatCurrencyNullable(value, currency);
}

/** Mirrors the preview's identity, facts, and connected-record regions. */
function CustomerPreviewPending() {
  return (
    <div role="status" className="space-y-5" aria-label="Loading customer preview">
      <div className="rounded-lg border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-4">
        <div className="flex items-center gap-3"><Bone className="h-12 w-12 rounded-full" /><div className="flex-1 space-y-2"><Bone className="h-4 w-32" /><Bone className="h-3 w-52" /></div></div>
        <Bone className="mt-3 h-6 w-24" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="rounded-md border border-[var(--ua-border-subtle)] p-3"><Bone className="h-3 w-16" /><Bone className="mt-2 h-5 w-20" /></div>)}</div>
      <div className="rounded-lg border border-[var(--ua-border-default)] p-4"><Bone className="h-4 w-40" /><div className="mt-3 space-y-3"><Bone className="h-10 w-full" /><Bone className="h-10 w-full" /></div></div>
    </div>
  );
}

function CustomerPreviewUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-[var(--ua-critical-border,var(--ua-border-default))] bg-[var(--ua-critical-bg,var(--ua-surface-muted))] p-4">
      <p className="font-semibold text-[var(--ua-text-primary)]">Customer preview unavailable</p>
      <p className="mt-1 text-sm text-[var(--ua-text-secondary)]">{message}</p>
      <p className="mt-1 text-sm text-[var(--ua-text-secondary)]">The customer may have been merged, deleted, or may no longer be available to your workspace.</p>
      <button type="button" className="mt-3 font-semibold text-[var(--ua-action-primary)]" onClick={onRetry}>Retry preview</button>
    </div>
  );
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
  const primaryTotal = useMemo(() => {
    if (!customer?.totalsByCurrency?.length) return null;
    return [...customer.totalsByCurrency].sort((a, b) => b.orders - a.orders)[0];
  }, [customer]);

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
              className="flex-1 rounded-md bg-[var(--ua-action-primary)] px-3 py-2 text-center text-sm font-semibold text-[var(--ua-action-primary-fg)]"
              href={`/customers/${customer.id}?return=${encodeURIComponent(returnUrl)}`}
            >
              Open full profile
            </Link>
            {customer.openCases.length === 1 ? <Link className="rounded-md border border-[var(--ua-border-default)] px-3 py-2 text-sm font-semibold" href={customer.openCases[0].href}>Open case</Link> : null}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-5 p-5" aria-live="polite">
        {state.loading ? <CustomerPreviewPending /> : null}

        {state.error ? <CustomerPreviewUnavailable message={state.error} onRetry={() => setRetryKey((value) => value + 1)} /> : null}

        {customer ? (
          <>
            <div className="rounded-lg border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ua-surface-primary)] text-sm font-semibold text-[var(--ua-text-primary)] ring-1 ring-[var(--ua-border-default)]">
                  {customer.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'C'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{customer.email ?? "Contact unavailable"}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--ua-text-secondary)]">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    Since {customer.firstSeen ? formatDateAbsolute(customer.firstSeen) : 'unavailable'}
                    {customer.lastOrderAt ? ` · Last order ${formatDate(customer.lastOrderAt)}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--ua-border-subtle)] pt-3">
                {customer.openCases.length
                  ? <Badge tone="warning" size="sm" dot>{customer.openCases.length} open case{customer.openCases.length === 1 ? '' : 's'}</Badge>
                  : <Badge tone="success" size="sm" dot>No open cases</Badge>}
                {customer.stats.possibleMatchCount ? <Badge tone="info" size="sm">{customer.stats.possibleMatchCount} possible match{customer.stats.possibleMatchCount === 1 ? '' : 'es'}</Badge> : null}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Orders', customer.stats.orders],
                ['Lifetime value', primaryTotal ? amount(primaryTotal.value, primaryTotal.currency) : '—'],
                ['Avg order', primaryTotal ? amount(primaryTotal.value / Math.max(primaryTotal.orders, 1), primaryTotal.currency) : '—'],
                ['Case rate', `${customer.stats.caseRate}%`],
              ].map(([name, value]) => <div key={name} className="min-w-0 rounded-md border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-primary)] p-3"><dt className="truncate text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">{name}</dt><dd className="mt-1 truncate text-lg font-semibold tabular-nums">{value}</dd></div>)}
            </dl>

            {customer.openExposureByCurrency.length ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--ua-warning-border,var(--ua-border-default))] bg-[var(--ua-warning-bg,var(--ua-surface-muted))] px-3 py-2 text-sm">
                <span className="inline-flex items-center gap-1.5 text-[var(--ua-warning)]"><TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> Open case exposure</span>
                <strong className="tabular-nums">{customer.openExposureByCurrency.map((item) => amount(item.value, item.currency)).join(' · ')}</strong>
              </div>
            ) : null}

            {customer.openCases.length ? (
              <section className="rounded-lg border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-4">
                <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--ua-text-secondary)]" aria-hidden="true" /><h3 className="font-semibold">Cases requiring attention</h3></div><Badge tone="warning" size="sm">Action needed</Badge></div>
                <ul className="mt-2 divide-y divide-[var(--ua-border-subtle)]">
                  {customer.openCases.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-3 py-3 hover:text-[var(--ua-action-primary)]"
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
              </section>
            ) : null}

            <section className="rounded-lg border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-4">
              <div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-[var(--ua-text-secondary)]" aria-hidden="true" /><h3 className="font-semibold">Recent store activity</h3></div>
              {customer.recent.length ? (
                <ul className="mt-2 divide-y divide-[var(--ua-border-subtle)]">
                  {customer.recent.map((item) => {
                    const items = item.lineItems ?? [];
                    const shown = items.slice(0, 2);
                    const extra = items.length - shown.length;
                    return (
                    <li key={item.href}>
                      <div className="flex items-center gap-3 py-3">
                        <Link
                          href={item.href}
                          className="flex min-w-0 flex-1 items-center justify-between gap-3"
                        >
                        <span className="min-w-0">
                          <span className="font-medium">Order {item.reference}</span>
                          <small className="mt-0.5 block text-[var(--ua-text-secondary)]">
                            {formatDate(item.at)}
                          </small>
                          {shown.length > 0 ? (
                            <small className="mt-1 block truncate text-[var(--ua-text-tertiary)]">
                              {shown.map((line) => `${line.quantity ? `${line.quantity}× ` : ""}${line.title}`).join(", ")}
                              {extra > 0 ? ` +${extra} more` : ""}
                            </small>
                          ) : null}
                          {item.shipmentStatus ? (
                            <small className="mt-1 block text-[var(--ua-text-tertiary)]">
                              {item.shipmentStatus}{item.shipmentCarrier ? ` · ${item.shipmentCarrier}` : ""}
                            </small>
                          ) : null}
                          {item.caseState ? <small className="mt-1 block"><StatusBadge family="caseStatus" value={item.caseState} size="sm" /></small> : null}
                        </span>
                          <span className="text-right"><strong className="block tabular-nums">{amount(item.amount, item.currency)}</strong>{item.caseType ? <small className="mt-1 block text-[var(--ua-text-secondary)]">{item.caseType}</small> : null}</span>
                        </Link>
                        {item.externalHref ? (
                          <a
                            href={item.externalHref}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open order in ${item.externalSource ?? "source"}`}
                            title={`Open in ${item.externalSource ?? "source"}`}
                            className="shrink-0 rounded p-1 text-[var(--ua-action-primary)] hover:bg-[var(--ua-surface-muted)]"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        ) : null}
                        {item.shipmentHref ? (
                          <a
                            href={item.shipmentHref}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open fulfilment in ${item.shipmentSource ?? "source"}`}
                            title={`Open fulfilment in ${item.shipmentSource ?? "source"}`}
                            className="shrink-0 rounded p-1 text-[var(--ua-action-primary)] hover:bg-[var(--ua-surface-muted)]"
                          >
                            <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </li>
                  );})}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--ua-text-secondary)]">
                  No recent activity was found.
                </p>
              )}
            </section>

            {customer.identitySignalCounts?.length || customer.sources.length ? (
              <section className="rounded-lg border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-4">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--ua-text-secondary)]" aria-hidden="true" /><h3 className="font-semibold">Identity</h3></div>
                {customer.identitySignalCounts?.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {customer.identitySignalCounts.map((row) => (
                      <Badge key={row.type} tone="neutral" size="sm">{row.distinctCount} {row.type.replace(/_/g, " ")}{row.distinctCount === 1 ? '' : 's'}</Badge>
                    ))}
                  </div>
                ) : null}
                {customer.sources.length ? (
                  <ul className="mt-3 divide-y divide-[var(--ua-border-subtle)] border-t border-[var(--ua-border-subtle)] pt-1">
                    {customer.sources.map((source, index) => (
                      <li key={`${source.provider}-${source.externalId}-${index}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="min-w-0 truncate"><span>{providerLabel(source.provider)}</span>{source.email ? ` · ${source.email}` : ""}</span>
                        {source.verified != null ? <Badge tone={source.verified ? "success" : "neutral"} size="sm">{source.verified ? "Verified" : "Unverified"}</Badge> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {customer.stats.possibleMatchCount ? (
                  <Link
                    href={`/customers/${customer.id}?return=${encodeURIComponent(returnUrl)}#identity`}
                    className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--ua-border-subtle)] pt-3 text-sm font-medium text-[var(--ua-action-primary)] hover:underline"
                  >
                    {customer.stats.possibleMatchCount} possible match{customer.stats.possibleMatchCount === 1 ? '' : 'es'} held separately
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </Link>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </Drawer>
  );
}
