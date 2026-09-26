"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { formatCurrencyNullable, formatDate, formatDateAbsolute } from "@/lib/utils/format";
import { providerLabel } from "@/lib/ui/merchantCopy";
import { UnavailableValue } from "@/components/ui";
const line = '1px solid #e4e3e0';
const styles: Record<string, CSSProperties> = {
  host: { position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end' }, scrim: { position: 'absolute', inset: 0, border: 0, background: 'rgba(28,27,25,.24)' },
  drawer: { position: 'relative', display: 'flex', width: 420, maxWidth: '100vw', height: '100%', flexDirection: 'column', borderLeft: line, background: '#fff', boxShadow: '-16px 0 40px rgba(28,27,25,.10)' },
  header: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: 18, borderBottom: line }, avatar: { display: 'grid', width: 42, height: 42, flex: '0 0 42px', placeItems: 'center', borderRadius: 12, background: '#f4f3f1', color: '#40454a', fontWeight: 600 },
  identity: { minWidth: 0, flex: 1 }, close: { display: 'grid', width: 30, height: 30, placeItems: 'center', border: 0, borderRadius: 8, background: '#f4f3f1', color: '#64686d' }, body: { overflowY: 'auto', flex: 1, padding: 18 },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', border: line, borderRadius: 10, overflow: 'hidden' }, section: { padding: '16px 0', borderBottom: line }, sectionHeading: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 }, chip: { padding: '4px 7px', borderRadius: 6, background: '#f4f3f1', color: '#40454a', fontSize: 10.5 }, meter: { height: 6, borderRadius: 99, background: '#e4e3e0', overflow: 'hidden' },
  list: { display: 'flex', flexDirection: 'column' }, listRow: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, padding: '9px 0', borderTop: line }, orderLink: { color: '#9f4f08', textDecoration: 'none' },
  freshness: { display: 'flex', alignItems: 'center', gap: 6, color: '#64686d', fontSize: 11 }, provenance: { padding: 12, borderRadius: 9, background: '#ffffff' }, provenanceTitle: { margin: 0, fontSize: 12 }, provenanceRow: { display: 'flex', justifyContent: 'space-between', gap: 10, paddingTop: 7, color: '#64686d', fontSize: 11 },
  unavailable: { color: '#6f6a63', fontSize: 11.5 }, noCases: { padding: 14, color: '#64686d', textAlign: 'center' }, pending: { color: '#7a5310' }, external: { color: '#64686d', fontSize: 11 },
  footer: { display: 'flex', gap: 8, padding: 16, borderTop: line }, primaryAction: { flex: 1, padding: '9px 12px', borderRadius: 8, background: '#1c1f23', color: '#fff', textAlign: 'center', textDecoration: 'none', fontSize: 12 }, secondaryAction: { flex: 1, padding: '9px 12px', border: line, borderRadius: 8, color: '#40454a', textAlign: 'center', textDecoration: 'none', fontSize: 12 },
  skeleton: { padding: 18 }, skeletonBlock: { height: 80, marginBottom: 12, borderRadius: 10, background: '#f4f3f1' }, skeletonLine: { height: 10, marginBottom: 8, borderRadius: 99, background: '#e4e3e0' }, skeletonLineShort: { width: '58%', height: 10, borderRadius: 99, background: '#e4e3e0' },
};

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
  return <span style={styles.chip} data-tone={tone}>{label}</span>;
}

function CustomerPreviewPending() {
  return (
    <div style={styles.pending} role="status" aria-label="Loading customer preview">
      <span style={styles.skeleton} />
      <span style={styles.skeletonLine} />
      <span style={styles.skeletonLineShort} />
      <span style={styles.skeletonBlock} />
    </div>
  );
}

function CustomerPreviewUnavailable({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={styles.unavailable} role="alert">
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
    <div style={styles.host} data-customer-preview={id ? "open" : "closed"}>
      {id ? <button type="button" style={styles.scrim} aria-label="Close customer preview" onClick={onClose} /> : null}
      {id ? (
        <aside role="dialog" aria-label="Customer preview" style={styles.drawer} data-preview-drawer="true">
          <header style={styles.header}>
            <div style={styles.identity}>
              <span style={styles.avatar}>{customer ? initials(customer.name) : "C"}</span>
              <div>
                <strong>{customer?.name ?? (state.loading ? "Loading customer…" : "Customer preview")}</strong>
                <span>{customer?.email ?? "Contact unavailable"}</span>
              </div>
            </div>
            <button type="button" style={styles.close} aria-label="Close customer preview" onClick={onClose}><X size={14} aria-hidden="true" /></button>
          </header>

          <div style={styles.body} aria-live="polite">
            {state.loading ? <CustomerPreviewPending /> : null}
            {state.error ? <CustomerPreviewUnavailable message={state.error} onRetry={() => setRetryKey((value) => value + 1)} /> : null}
            {customer ? (
              <>
                <div style={styles.chips} aria-label="Customer state">
                  <StateChip label={customer.openCases.length ? `${customer.openCases.length} open case${customer.openCases.length === 1 ? "" : "s"}` : "No open cases"} tone="neutral" />
                  <StateChip label={customer.stats.chargebacks ? "Chargeback history" : "No chargebacks observed"} tone={customer.stats.chargebacks ? "bad" : "neutral"} />
                  <StateChip label={customer.sources.length ? `${customer.sources.length} source${customer.sources.length === 1 ? "" : "s"}` : "Source coverage unavailable"} />
                </div>

                <dl style={styles.stats} aria-label="Customer summary">
                  <div><dt>Lifetime</dt><dd>{primaryTotal ? amount(primaryTotal.value, primaryTotal.currency) : <UnavailableValue placement="metric" />}</dd><small>{primaryTotal ? `${primaryTotal.orders} orders` : "No verified order total"}</small></div>
                  <div><dt>Refunded</dt><dd>{countLabel(customer.stats.completedRefunds365d, "refund")}</dd><small>Completed · last 365d</small></div>
                  <div><dt>Refund rate</dt><dd>{refundRequests == null ? <UnavailableValue placement="metric" /> : refundRate}</dd><small>{refundRequests == null ? "Basis unavailable" : `${refundRequests} requests / ${customer.stats.orders} orders`}</small></div>
                </dl>

                <section style={styles.cohort} aria-labelledby="customer-preview-cohort-title">
                  <div style={styles.sectionHeading}><h3 id="customer-preview-cohort-title">Refund rate against cohort</h3><span><UnavailableValue placement="inline" /></span></div>
                  <div style={styles.meter} aria-label="Refund rate against cohort unavailable"><i /><b /></div>
                  <p>Cohort median unavailable · refunded value is not in the current customer read model.</p>
                </section>

                <section style={styles.section} aria-labelledby="customer-preview-cases-title">
                  <div style={styles.sectionHeading}><h3 id="customer-preview-cases-title">Open cases</h3><span>{customer.openCases.length ? `${customer.openCases.length} requiring attention` : "None"}</span></div>
                  {customer.openCases.length ? (
                    <div style={styles.list}>
                      {customer.openCases.slice(0, 3).map((item) => (
                        <Link href={item.href} key={item.id} style={styles.listRow}>
                          <span><b>{item.reference}</b><small>{item.state}</small></span>
                          <strong>{amount(item.amount, item.currency)} <ArrowUpRight size={12} aria-hidden="true" /></strong>
                        </Link>
                      ))}
                    </div>
                  ) : <p style={styles.noCases}>No open cases are recorded for this customer in the current workspace.</p>}
                </section>

                <section style={styles.section} aria-labelledby="customer-preview-orders-title">
                  <div style={styles.sectionHeading}><h3 id="customer-preview-orders-title">Recent orders</h3><span>{customer.recent.length ? "Last 3 recorded" : <UnavailableValue placement="inline" />}</span></div>
                  {customer.recent.length ? (
                    <div style={styles.list}>
                      {customer.recent.slice(0, 3).map((item) => (
                        <div style={styles.listRow} key={item.href}>
                          <Link href={item.href} style={styles.orderLink}>
                            <span><b>{item.reference}</b><small>{formatDate(item.at)}{item.shipmentStatus ? ` · ${item.shipmentStatus}` : ""}</small></span>
                            <strong>{amount(item.amount, item.currency)}</strong>
                          </Link>
                          {item.externalHref ? <a href={item.externalHref} target="_blank" rel="noreferrer" style={styles.external} aria-label={`Open order in ${item.externalSource ?? "source"}`}><ArrowUpRight size={12} aria-hidden="true" /></a> : null}
                        </div>
                      ))}
                    </div>
                  ) : <p style={styles.noCases}>Recent order records are unavailable for this customer.</p>}
                </section>

                <section style={styles.provenance} aria-labelledby="customer-preview-provenance-title">
                  <div style={styles.provenanceTitle}><ShieldCheck size={13} aria-hidden="true" /><h3 id="customer-preview-provenance-title">Evidence behind this view</h3></div>
                  {customer.sources.length ? customer.sources.map((source, index) => (
                    <div style={styles.provenanceRow} key={`${source.provider}-${source.externalId}-${index}`}>
                      <i data-state={source.verified === false ? "warn" : source.verified === true ? "good" : "neutral"} />
                      <span>{providerLabel(source.provider)}</span>
                      <small>{source.asOf ? `Fresh ${formatDateAbsolute(source.asOf)}` : "Freshness unavailable"}</small>
                    </div>
                  )) : <p style={styles.noCases}>No source provenance is available for this preview.</p>}
                  {customer.firstSeen ? <p style={styles.freshness}><CalendarDays size={12} aria-hidden="true" /> First seen {formatDateAbsolute(customer.firstSeen)}{customer.lastOrderAt ? ` · last order ${formatDate(customer.lastOrderAt)}` : ""}</p> : null}
                </section>
              </>
            ) : null}
          </div>

          {customer ? (
            <footer style={styles.footer}>
              <Link href={`/customers/${customer.id}`} style={styles.primaryAction}>Open full profile</Link>
              <Link href={secondaryHref} style={styles.secondaryAction}>{secondaryLabel}</Link>
            </footer>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
