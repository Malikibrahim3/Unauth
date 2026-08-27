"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrencyNullable, formatDate, formatDateAbsolute } from "@/lib/utils/format";
import { providerLabel } from "@/lib/ui/merchantCopy";
import { UnavailableValue } from "@/components/ui";
import styles from "./CustomerPreviewDrawer.module.css";

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
      refundRequests365d?: number;
      completedRefunds365d?: number;
      possibleMatchCount?: number;
    };
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
  return value == null || !currency ? "Amount unavailable" : formatCurrencyNullable(value, currency);
}

function countLabel(value: number | undefined, noun: string) {
  return value == null ? <UnavailableValue placement="metric" /> : `${value} ${noun}${value === 1 ? "" : "s"}`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C";
}

function StateChip({ label, tone = "neutral" }: { label: string; tone?: "good" | "warn" | "bad" | "neutral" }) {
  return <span className={styles.chip} data-tone={tone}>{label}</span>;
}

function CustomerPreviewPending() {
  return (
    <div className={styles.pending} role="status" aria-label="Loading customer preview">
      <span className={styles.skeleton} />
      <span className={styles.skeletonLine} />
      <span className={styles.skeletonLineShort} />
      <span className={styles.skeletonBlock} />
    </div>
  );
}

function CustomerPreviewUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.unavailable} role="alert">
      <strong>Customer preview unavailable</strong>
      <p>{message}</p>
      <p>The customer may have been merged, deleted, or may no longer be available to your workspace.</p>
      <button type="button" onClick={onRetry}>Retry preview</button>
    </div>
  );
}

export function CustomerPreviewDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [state, setState] = useState<{ loading: boolean; data?: Preview; error?: string }>({ loading: false });
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
        if (error.name !== "AbortError") setState({ loading: false, error: error.message });
      });

    return () => controller.abort();
  }, [id, retryKey]);

  useEffect(() => {
    if (!id) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [id, onClose]);

  const customer = state.data?.customer;
  const primaryTotal = useMemo(() => {
    if (!customer?.totalsByCurrency?.length) return null;
    return [...customer.totalsByCurrency].sort((a, b) => b.orders - a.orders)[0];
  }, [customer]);

  const secondaryHref = customer?.openCases.length === 1
    ? customer.openCases[0].href
    : customer
      ? `/customers/${customer.id}?tab=cases`
      : "/customers";
  const secondaryLabel = customer?.openCases.length === 1 ? "Open case" : "Open cases";
  const refundRequests = customer?.stats.refundRequests365d;
  const refundRate = customer && refundRequests != null && customer.stats.orders > 0
    ? `${Math.round((refundRequests / customer.stats.orders) * 100)}%`
    : "—";

  return (
    <div className={styles.host} data-customer-preview={id ? "open" : "closed"}>
      {id ? <button type="button" className={styles.scrim} aria-label="Close customer preview" onClick={onClose} /> : null}
      {id ? (
        <aside role="dialog" aria-label="Customer preview" className={styles.drawer} data-preview-drawer="true">
          <header className={styles.header}>
            <div className={styles.identity}>
              <span className={styles.avatar}>{customer ? initials(customer.name) : "C"}</span>
              <div>
                <strong>{customer?.name ?? (state.loading ? "Loading customer…" : "Customer preview")}</strong>
                <span>{customer?.email ?? "Contact unavailable"}</span>
              </div>
            </div>
            <button type="button" className={styles.close} aria-label="Close customer preview" onClick={onClose}><X size={14} aria-hidden="true" /></button>
          </header>

          <div className={styles.body} aria-live="polite">
            {state.loading ? <CustomerPreviewPending /> : null}
            {state.error ? <CustomerPreviewUnavailable message={state.error} onRetry={() => setRetryKey((value) => value + 1)} /> : null}
            {customer ? (
              <>
                <div className={styles.chips} aria-label="Customer state">
                  <StateChip label={customer.openCases.length ? `${customer.openCases.length} open case${customer.openCases.length === 1 ? "" : "s"}` : "No open cases"} tone="neutral" />
                  <StateChip label={customer.stats.chargebacks ? "Chargeback history" : "No chargebacks observed"} tone={customer.stats.chargebacks ? "bad" : "neutral"} />
                  <StateChip label={customer.sources.length ? `${customer.sources.length} source${customer.sources.length === 1 ? "" : "s"}` : "Source coverage unavailable"} />
                </div>

                <dl className={styles.stats} aria-label="Customer summary">
                  <div><dt>Lifetime</dt><dd>{primaryTotal ? amount(primaryTotal.value, primaryTotal.currency) : <UnavailableValue placement="metric" />}</dd><small>{primaryTotal ? `${primaryTotal.orders} orders` : "No verified order total"}</small></div>
                  <div><dt>Refunded</dt><dd>{countLabel(customer.stats.completedRefunds365d, "refund")}</dd><small>Completed · last 365d</small></div>
                  <div><dt>Refund rate</dt><dd>{refundRequests == null ? <UnavailableValue placement="metric" /> : refundRate}</dd><small>{refundRequests == null ? "Basis unavailable" : `${refundRequests} requests / ${customer.stats.orders} orders`}</small></div>
                </dl>

                <section className={styles.cohort} aria-labelledby="customer-preview-cohort-title">
                  <div className={styles.sectionHeading}><h3 id="customer-preview-cohort-title">Refund rate against cohort</h3><span><UnavailableValue placement="inline" /></span></div>
                  <div className={styles.meter} aria-label="Refund rate against cohort unavailable"><i /><b /></div>
                  <p>Cohort median unavailable · refunded value is not in the current customer read model.</p>
                </section>

                <section className={styles.section} aria-labelledby="customer-preview-cases-title">
                  <div className={styles.sectionHeading}><h3 id="customer-preview-cases-title">Open cases</h3><span>{customer.openCases.length ? `${customer.openCases.length} requiring attention` : "None"}</span></div>
                  {customer.openCases.length ? (
                    <div className={styles.list}>
                      {customer.openCases.slice(0, 3).map((item) => (
                        <Link href={item.href} key={item.id} className={styles.listRow}>
                          <span><b>{item.reference}</b><small>{item.state}</small></span>
                          <strong>{amount(item.amount, item.currency)} <ArrowUpRight size={12} aria-hidden="true" /></strong>
                        </Link>
                      ))}
                    </div>
                  ) : <p className={styles.noCases}>No open cases are recorded for this customer in the current workspace.</p>}
                </section>

                <section className={styles.section} aria-labelledby="customer-preview-orders-title">
                  <div className={styles.sectionHeading}><h3 id="customer-preview-orders-title">Recent orders</h3><span>{customer.recent.length ? "Last 3 recorded" : <UnavailableValue placement="inline" />}</span></div>
                  {customer.recent.length ? (
                    <div className={styles.list}>
                      {customer.recent.slice(0, 3).map((item) => (
                        <div className={styles.listRow} key={item.href}>
                          <Link href={item.href} className={styles.orderLink}>
                            <span><b>{item.reference}</b><small>{formatDate(item.at)}{item.shipmentStatus ? ` · ${item.shipmentStatus}` : ""}</small></span>
                            <strong>{amount(item.amount, item.currency)}</strong>
                          </Link>
                          {item.externalHref ? <a href={item.externalHref} target="_blank" rel="noreferrer" className={styles.external} aria-label={`Open order in ${item.externalSource ?? "source"}`}><ArrowUpRight size={12} aria-hidden="true" /></a> : null}
                        </div>
                      ))}
                    </div>
                  ) : <p className={styles.noCases}>Recent order records are unavailable for this customer.</p>}
                </section>

                <section className={styles.provenance} aria-labelledby="customer-preview-provenance-title">
                  <div className={styles.provenanceTitle}><ShieldCheck size={13} aria-hidden="true" /><h3 id="customer-preview-provenance-title">Evidence behind this view</h3></div>
                  {customer.sources.length ? customer.sources.map((source, index) => (
                    <div className={styles.provenanceRow} key={`${source.provider}-${source.externalId}-${index}`}>
                      <i data-state={source.verified === false ? "warn" : source.verified === true ? "good" : "neutral"} />
                      <span>{providerLabel(source.provider)}</span>
                      <small>{source.asOf ? `Fresh ${formatDateAbsolute(source.asOf)}` : "Freshness unavailable"}</small>
                    </div>
                  )) : <p className={styles.noCases}>No source provenance is available for this preview.</p>}
                  {customer.firstSeen ? <p className={styles.freshness}><CalendarDays size={12} aria-hidden="true" /> First seen {formatDateAbsolute(customer.firstSeen)}{customer.lastOrderAt ? ` · last order ${formatDate(customer.lastOrderAt)}` : ""}</p> : null}
                </section>
              </>
            ) : null}
          </div>

          {customer ? (
            <footer className={styles.footer}>
              <Link href={`/customers/${customer.id}`} className={styles.primaryAction}>Open full profile</Link>
              <Link href={secondaryHref} className={styles.secondaryAction}>{secondaryLabel}</Link>
            </footer>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
