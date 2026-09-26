import Link from '@/components/navigation/AppNavLink';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import type { ObjectFact, ObjectItem, ObjectLink, ObjectSummary } from '@/lib/relationships/objectSummary';
import { ProductThumbnail } from '@/components/ui/ProductThumbnail';
import { formatCurrencyNullable, formatDateShort, formatDateTime, formatMinorCurrencyNullable, formatNumber } from '@/lib/utils/format';
import { objectDisplayRef } from '@/lib/ui/displayRef';

function human(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
function titleFor(object: ObjectSummary) {
  return objectDisplayRef(object.type, object.reference, object.id);
}
function sourceIdFor(object: ObjectSummary) {
  return `${human(object.type)}-Detail-Clean`;
}

const INTERNAL_RETURN_BASE = 'https://unauth.internal';
const FORBIDDEN_CONNECTED_INDEXES = new Set(['/orders', '/shipments', '/tickets', '/refunds', '/returns', '/disputes']);
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

export function safeInternalReturn(raw?: string): string | null {
  if (!raw || raw !== raw.trim() || !raw.startsWith('/') || raw.startsWith('//')) return null;
  if (raw.includes('\\') || CONTROL_CHARACTER.test(raw)) return null;
  try {
    const parsed = new URL(raw, INTERNAL_RETURN_BASE);
    if (parsed.origin !== INTERNAL_RETURN_BASE) return null;
    const decodedPathname = decodeURIComponent(parsed.pathname);
    if (decodedPathname.includes('\\') || decodedPathname.startsWith('//') || CONTROL_CHARACTER.test(decodedPathname)) return null;
    const normalizedPathname = decodedPathname.length > 1 ? decodedPathname.replace(/\/+$/, '') : decodedPathname;
    if (FORBIDDEN_CONNECTED_INDEXES.has(normalizedPathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function objectLinkIdentity(link: ObjectLink): string {
  return link.role ? `${link.type}:${link.id}:${link.role}` : `${link.type}:${link.id}`;
}

export function uniqueObjectLinks(links: ObjectLink[]): ObjectLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const identity = objectLinkIdentity(link);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export type ConnectedObjectBackLink = { href: string; label: string };

function requestedReturnLabel(href: string): string {
  const segment = new URL(href, INTERNAL_RETURN_BASE).pathname.split('/').filter(Boolean)[0];
  if (segment === 'work') return 'Back to work';
  if (segment === 'cases') return 'Back to cases';
  if (segment === 'customers') return 'Back to customers';
  if (segment === 'financials') return 'Back to financials';
  if (segment === 'sources') return 'Back to sources';
  if (segment === 'search') return 'Back to search';
  return 'Back to previous view';
}

export function resolveConnectedObjectBackLink(object: ObjectSummary, requestedReturn?: string): ConnectedObjectBackLink {
  const safeReturn = safeInternalReturn(requestedReturn);
  if (safeReturn) return { href: safeReturn, label: requestedReturnLabel(safeReturn) };
  if (object.customer) return { href: object.customer.href, label: 'Back to customer' };
  return { href: `/search?q=${encodeURIComponent(object.reference)}`, label: 'Search workspace' };
}

type EvidenceThreadItem = {
  key: string;
  authority: 'source' | 'fact' | 'external-action';
  label: string;
  value: string;
  meta?: string;
  href?: string;
  state: 'known' | 'stale' | 'recorded';
};

export function buildOrderEvidenceSpine(object: ObjectSummary): EvidenceThreadItem[] {
  if (object.type !== 'order') return [];
  const source = object.provenance?.sourceSystem ?? object.provider ?? 'Connected source';
  const updated = object.provenance?.sourceUpdatedAt ?? object.provenance?.lastSyncedAt ?? object.updatedAt;
  const freshness = object.provenance?.freshness === 'stale' ? 'stale' : 'known';
  return [
    {
      key: `source-${object.id}`,
      authority: 'source',
      label: 'Source order',
      value: titleFor(object),
      meta: `${human(source)} · ${updated ? formatDateTime(updated) : 'Freshness unavailable'}`,
      state: freshness,
    },
    ...object.connected
      .filter((linked) => linked.type === 'shipment' || linked.type === 'fulfilment')
      .map((linked) => ({
        key: `fulfilment-${linked.type}-${linked.id}`,
        authority: 'fact' as const,
        label: linked.type === 'shipment' ? 'Fulfilment and delivery' : 'Fulfilment',
        value: objectDisplayRef(linked.type, linked.reference, linked.id),
        meta: linked.state ? human(linked.state) : 'State unavailable',
        href: linked.href,
        state: 'recorded' as const,
      })),
    ...object.evidence.map((entry) => ({
      key: `evidence-${entry.id}`,
      authority: 'fact' as const,
      label: entry.title,
      value: entry.summary,
      meta: `${human(entry.provider)} · ${entry.occurredAt ? formatDateTime(entry.occurredAt) : 'Time unavailable'} · ${human(entry.confidence)}`,
      state: 'recorded' as const,
    })),
    ...object.payoutCases.map((linked) => ({
      key: `case-${linked.id}`,
      authority: 'fact' as const,
      label: 'Linked case',
      value: objectDisplayRef(linked.type, linked.reference, linked.id),
      meta: linked.state ? `Workflow state: ${human(linked.state)}` : 'Workflow state unavailable',
      href: linked.href,
      state: 'recorded' as const,
    })),
    ...object.connected
      .filter((linked) => linked.type === 'recovery')
      .map((linked) => ({
        key: `recovery-${linked.id}`,
        authority: 'external-action' as const,
        label: 'Linked recovery',
        value: objectDisplayRef(linked.type, linked.reference, linked.id),
        meta: linked.state ? human(linked.state) : 'Recovery state unavailable',
        href: linked.href,
        state: 'recorded' as const,
      })),
  ];
}

const TYPE_COPY: Record<ObjectSummary['type'], {
  primary: string;
  analysis: string;
  analysisMeta: string;
  lifecycle: string;
  not: string;
}> = {
  order: {
    primary: 'LINE ITEMS',
    analysis: 'WHAT IS ACTUALLY AT RISK',
    analysisMeta: 'revenue is not exposure · margin is',
    lifecycle: 'ORDER LIFECYCLE',
    not: 'A source-observed order. Unauth cannot edit it, cancel it, or refund from this page — a refund is prepared as a handoff on the case and issued in Shopify.',
  },
  refund: {
    primary: 'WHAT WAS REFUNDED',
    analysis: 'WHAT WAS AND WAS NOT REFUNDED',
    analysisMeta: 'line level · source-recorded values only',
    lifecycle: 'REFUND LIFECYCLE',
    not: 'Not recovered money. A customer refund and a provider recovery are separate financial events until both are observed and reconciled.',
  },
  return: {
    primary: 'RETURN PROGRESSION',
    analysis: 'RETURNS WITH NO TRANSIT SCAN',
    analysisMeta: 'source gaps remain explicit',
    lifecycle: 'RECORDED EVENTS',
    not: 'Not proof of custody where no carrier scan exists. The record shows the source progression without inventing a handover.',
  },
  shipment: {
    primary: 'CUSTODY AND SCANS',
    analysis: 'CUSTODY, AND WHERE IT BREAKS',
    analysisMeta: 'source scans are evidence · unwitnessed gaps remain gaps',
    lifecycle: 'WHAT UNAUTH DID WITH THIS',
    not: 'Not proof that Unauth witnessed delivery. Each custody statement is limited to the connected provider scans returned for this shipment.',
  },
  ticket: {
    primary: 'CONVERSATION',
    analysis: 'RESPONSE TIMES, AND THEN NONE',
    analysisMeta: 'measured only between observed messages',
    lifecycle: 'TICKET EVENTS',
    not: 'Not a complete conversation when the helpdesk withholds message content or a source token is stale. Missing messages are never inferred.',
  },
  dispute: {
    primary: 'EVIDENCE THE NETWORK WILL ACCEPT',
    analysis: 'THE CLOCK ON THIS DISPUTE',
    analysisMeta: 'provider deadline · no inferred extension',
    lifecycle: 'DISPUTE LIFECYCLE',
    not: 'Not a settled loss. The disputed amount remains estimated until the network outcome is observed and the financial record is reconciled.',
  },
};

function FactValue({ fact }: { fact: ObjectFact }) {
  if (fact.value == null) return <>Unavailable</>;
  if (fact.kind === 'money') return <>{typeof fact.value === 'number' ? formatCurrencyNullable(fact.value, fact.currency) ?? 'Unavailable' : 'Unavailable'}</>;
  if (fact.kind === 'date') return <>{typeof fact.value === 'string' ? formatDateTime(fact.value) : 'Unavailable'}</>;
  if (fact.kind === 'boolean') return <>{fact.value ? 'Yes' : 'No'}</>;
  if (fact.kind === 'number') return <>{typeof fact.value === 'number' ? formatNumber(fact.value) : 'Unavailable'}</>;
  return <>{String(fact.value).replaceAll('_', ' ')}</>;
}

function Panel({ children, grow = false }: { children: React.ReactNode; grow?: boolean }) {
  return <section style={{ flex: grow ? 1 : 'none', minHeight: grow ? 0 : undefined, padding: '12px 16px 10px', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', overflow: grow ? 'auto' : undefined }}>{children}</section>;
}

function SectionTitle({ children, meta }: { children: React.ReactNode; meta?: React.ReactNode }) {
  return <header style={{ paddingBottom: 8, display: 'flex', alignItems: 'baseline', gap: 10 }}><h2 style={{ flex: 1, margin: 0, color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>{children}</h2>{meta ? <span style={{ color: '#64686d', font: "400 10.5px/1 'IBM Plex Mono',monospace", whiteSpace: 'nowrap' }}>{meta}</span> : null}</header>;
}

function EmptyRecord({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: 88, display: 'grid', placeItems: 'center', borderRadius: 9, background: '#f4f3f1', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif", textAlign: 'center' }}>{children}</div>;
}

type SectionKey = 'items' | 'conversation' | 'custody' | 'evidence';
function MissingRecordSection({ object, section, fallback }: { object: ObjectSummary; section: SectionKey; fallback: string }) {
  const coverage = object.sectionCoverage?.[section];
  if (!coverage) return <EmptyRecord>{fallback}</EmptyRecord>;
  return <EmptyRecord><span><strong style={{ display: 'block', color: '#40454a', fontWeight: 500 }}>{human(coverage.state)}</strong>{coverage.explanation}{coverage.repairHref ? <><br/><Link href={coverage.repairHref} style={{ color: '#9f4f08' }}>{coverage.repairHref.startsWith('/sources') ? 'Review connected sources' : 'Open source record'}</Link></> : null}</span></EmptyRecord>;
}

function OrderToolbar({ object }: { object: ObjectSummary }) {
  const fulfilled = object.facts.find((fact) => fact.label === 'Fulfilment')?.value;
  const status = [object.state, typeof fulfilled === 'string' ? fulfilled : null].filter(Boolean).map((value) => human(value!)).join(' · ') || 'State unavailable';
  const attention = /pending|unfulfilled|fail|cancel|unavailable/i.test(status);
  const placed = object.facts.find((fact) => fact.label === 'Placed')?.value;
  const placedLabel = typeof placed === 'string' && Number.isFinite(Date.parse(placed)) ? formatDateShort(placed) : 'date unavailable';
  const itemCount = `${formatNumber(object.items.length)} retained line record${object.items.length === 1 ? '' : 's'}`;
  return (<div style={{ "height": "54px", "flex": "none", "display": "flex", "alignItems": "center", "gap": "12px", "padding": "0 22px", "borderBottom": "1px solid #eae8e5" }}>{"\n      "}<span style={{ "padding": "3px 8px", "borderRadius": "6px", "background": attention ? "#fff3e9" : "#eef6f1", "font": "500 10px/1.5 'Inter',sans-serif", "letterSpacing": ".05em", "color": attention ? "#7a5310" : "#1a6b43" }}>{status.toUpperCase()}</span>{"\n      "}<span style={{ "font": "500 14.5px/1.2 'Inter',sans-serif", "color": "#1c1f23" }}>{object.customer?.reference ?? "Customer unavailable"}</span>{"\n      "}<span style={{ "font": "400 12px/1.4 'Inter',sans-serif", "color": "#64686d" }}>{`placed ${placedLabel} · ${itemCount} · ${object.destinationLabel ?? "destination unavailable"}`}</span>{"\n      "}<div style={{ "flex": "1" }}></div>{"\n      "}<div style={{ "display": "flex", "alignItems": "baseline", "gap": "8px" }}><span style={{ "font": "400 18px/1 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{formatCurrencyNullable(object.amount, object.currency)}</span><span style={{ "font": "400 11.5px/1 'Inter',sans-serif", "color": "#64686d" }}>{"order total"}</span></div>{"\n    "}</div>);
}

function OrderFacts({ object }: { object: ObjectSummary }) {
  const readFact = (label: string) => <FactValue fact={object.facts.find((fact) => fact.label === label) ?? { label, value: null }} />;
  const openCase = object.payoutCases.find((item) => ['pending', 'open', 'in_progress'].includes(item.state ?? ''));
  return (<div style={{ "background": "#f4f3f1", "borderRadius": "12px", "padding": "13px 16px", "flex": "none", "display": "grid", "gridTemplateColumns": "repeat(5,1fr)", "gap": "16px" }}>{"\n            "}<div style={{ "minWidth": "0" }}>{"\n              "}<div style={{ "font": "600 9.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d", "marginBottom": "6px" }}>{"PAYMENT"}</div>{"\n              "}<div style={{ "font": "400 13px/1.3 'Inter',sans-serif", "color": "#1c1f23" }}>{readFact("Payment gateway")}</div>{"\n            "}</div>{"\n            "}<div style={{ "minWidth": "0" }}>{"\n              "}<div style={{ "font": "600 9.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d", "marginBottom": "6px" }}>{"SHIPPING"}</div>{"\n              "}<div style={{ "font": "400 13px/1.3 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{readFact("Shipping")}</div>{"\n            "}</div>{"\n            "}<div style={{ "minWidth": "0" }}>{"\n              "}<div style={{ "font": "600 9.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d", "marginBottom": "6px" }}>{"FULFILMENT"}</div>{"\n              "}<div style={{ "font": "400 13px/1.3 'Inter',sans-serif", "color": "#1c1f23" }}>{readFact("Fulfilment")}</div>{"\n            "}</div>{"\n            "}<div style={{ "minWidth": "0" }}>{"\n              "}<div style={{ "font": "600 9.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d", "marginBottom": "6px" }}>{"REFUNDED"}</div>{"\n              "}<div style={{ "font": "400 13px/1.3 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{readFact("Refunded amount")}</div>{"\n            "}</div>{"\n            "}<div style={{ "minWidth": "0" }}>{"\n              "}<div style={{ "font": "600 9.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d", "marginBottom": "6px" }}>{"OPEN CASE"}</div>{"\n              "}<div style={{ "font": "400 13px/1.3 'Inter',sans-serif", "color": "#9b470d" }}>{openCase ? objectDisplayRef("case", openCase.reference, openCase.id) : "Unavailable"}</div>{"\n            "}</div>{"\n        "}</div>);
}

function OrderItemName({ item }: { item: ObjectItem }) {
  return <span style={{ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', gap: 10, color: '#1c1f23', font: "400 12px/1.4 'Inter',sans-serif" }}>
    <ProductThumbnail src={item.imageUrl} />
    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{item.title}</span>
  </span>;
}

function OrderItemsPanel({ object }: { object: ObjectSummary }) {
  const currencies = new Set(object.items.map((item) => item.currency));
  const goods = object.items.length && currencies.size === 1 && object.items.every((item) => item.amount != null)
    ? formatCurrencyNullable(object.items.reduce((sum, item) => sum + item.amount!, 0), object.items[0].currency) : 'Unavailable';
  return (<div style={{ "background": "#ffffff", "borderRadius": "10px", "boxShadow": "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)", "padding": "12px 16px 10px", "flex": "none", "display": "flex", "flexDirection": "column" }}>{"\n          "}<div style={{ "display": "flex", "alignItems": "baseline", "gap": "10px", "paddingBottom": "8px" }}>{"\n            "}<span style={{ "flex": "1", "font": "600 10.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d" }}>{"LINE ITEMS"}</span>{"\n            "}<span style={{ "font": "400 10.5px/1 'IBM Plex Mono',monospace", "color": "#64686d" }}>{`${formatNumber(object.items.length)} items · ${goods} goods`}</span>{"\n          "}</div>{"\n          "}<div style={{ "display": "flex", "alignItems": "center", "gap": "12px", "padding": "0 0 7px" }}><span style={{ "flex": "1", "minWidth": "0", "font": "400 9.5px/1 'Inter',sans-serif", "letterSpacing": ".06em", "color": "#64686d" }}>{"ITEM"}</span><span style={{ "width": "120px", "flex": "none", "font": "400 9.5px/1 'Inter',sans-serif", "letterSpacing": ".06em", "color": "#64686d" }}>{"SKU"}</span><span style={{ "width": "48px", "flex": "none", "textAlign": "right", "font": "400 9.5px/1 'Inter',sans-serif", "letterSpacing": ".06em", "color": "#64686d" }}>{"QTY"}</span><span style={{ "width": "86px", "flex": "none", "textAlign": "right", "font": "400 9.5px/1 'Inter',sans-serif", "letterSpacing": ".06em", "color": "#64686d" }}>{"UNIT"}</span><span style={{ "width": "86px", "flex": "none", "textAlign": "right", "font": "400 9.5px/1 'Inter',sans-serif", "letterSpacing": ".06em", "color": "#64686d" }}>{"TOTAL"}</span><span style={{ "width": "96px", "flex": "none", "textAlign": "right", "font": "400 9.5px/1 'Inter',sans-serif", "letterSpacing": ".06em", "color": "#64686d" }}>{"STATUS"}</span></div>{object.items.map((item) => (<div key={item.id} style={{ "display": "flex", "alignItems": "center", "gap": "12px", "padding": "9px 0", "borderTop": "1px solid #f4f2ef" }}><OrderItemName item={item}/><span style={{ "width": "120px", "flex": "none", "font": "400 11.5px/1.4 'IBM Plex Mono',monospace", "color": "#64686d" }}>{item.sku ?? "Unavailable"}</span><span style={{ "width": "48px", "flex": "none", "textAlign": "right", "font": "400 11.5px/1.4 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{item.quantity == null ? "—" : formatNumber(item.quantity)}</span><span style={{ "width": "86px", "flex": "none", "textAlign": "right", "font": "400 11.5px/1.4 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{formatMinorCurrencyNullable(item.unitPriceMinor ?? null, item.currency)}</span><span style={{ "width": "86px", "flex": "none", "textAlign": "right", "font": "400 11.5px/1.4 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{formatCurrencyNullable(item.amount, item.currency)}</span><span style={{ "width": "96px", "flex": "none", "textAlign": "right", "font": "400 12px/1.4 'Inter',sans-serif", "color": "#64686d" }}>{item.state ? human(item.state) : "Unavailable"}</span></div>))}{"\n        "}{!object.items.length ? <MissingRecordSection object={object} section="items" fallback="Line-item availability is unavailable."/> : null}</div>);
}

function OrderRiskPanel({ object }: { object: ObjectSummary }) {
  return (<div style={{ "background": "#ffffff", "borderRadius": "10px", "boxShadow": "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)", "padding": "12px 16px 12px", "flex": "none" }}>{"\n          "}<div style={{ "display": "flex", "alignItems": "baseline", "gap": "10px", "paddingBottom": "11px" }}><span style={{ "flex": "1", "font": "600 10.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d" }}>{"WHAT IS ACTUALLY AT RISK"}</span><span style={{ "font": "400 10.5px/1 'IBM Plex Mono',monospace", "color": "#64686d", "whiteSpace": "nowrap" }}>{"revenue is not exposure · margin is"}</span></div>{"\n          "}<div style={{ "display": "flex", "gap": "18px", "alignItems": "flex-start" }}><div style={{ "flex": "1", "minWidth": "0", "display": "flex", "flexDirection": "column", "gap": "8px" }}>{"\n            "}{object.items.map((item) => (<div key={item.id} style={{ "display": "flex", "alignItems": "center", "gap": "11px" }}>{"\n              "}<span style={{ "width": "196px", "flex": "none", "font": "400 11.5px/1.4 'Inter',sans-serif", "color": "#1c1f23", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{`${item.title}${item.quantity != null && item.quantity > 1 ? ` ×${formatNumber(item.quantity)}` : ""}`}</span>{"\n              "}<span style={{ "flex": "1", "height": "9px", "borderRadius": "2px", "background": "#f2f0ed", "overflow": "hidden", "display": "flex" }}>{"\n                "}<span style={{ "width": `${item.marginState === "available" && item.marginRatePercent != null ? Math.max(0, Math.min(100, Math.round(item.marginRatePercent * 10) / 10)) : 0}%`, "height": "100%", "background": "#1a6b43", "display": "block" }}></span>{"\n                "}<span style={{ "flex": "1", "height": "100%", "background": "#e0d9d0", "display": "block" }}></span>{"\n              "}</span>{"\n              "}<span style={{ "width": "80px", "flex": "none", "textAlign": "right", "font": "400 11.5px/1.4 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{formatCurrencyNullable(item.amount, item.currency)}</span>{"\n              "}<span style={{ "width": "76px", "flex": "none", "textAlign": "right", "font": "400 11.5px/1.4 'IBM Plex Mono',monospace", "color": "#1a6b43" }}>{formatMinorCurrencyNullable(item.marginState === "available" ? item.marginMinor ?? null : null, item.currency)}</span>{"\n            "}</div>))}<div style={{ "display": "flex", "alignItems": "center", "gap": "11px" }}>{"\n              "}<span style={{ "width": "196px", "flex": "none", "font": "400 11.5px/1.4 'Inter',sans-serif", "color": "#1c1f23", "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis" }}>{"Shipping · unavailable"}</span>{"\n              "}<span style={{ "flex": "1", "height": "9px", "borderRadius": "2px", "background": "#f2f0ed", "overflow": "hidden", "display": "flex" }}>{"\n                "}<span style={{ "width": "-35.0%", "height": "100%", "background": "#1a6b43", "display": "block" }}></span>{"\n                "}<span style={{ "flex": "1", "height": "100%", "background": "#e0d9d0", "display": "block" }}></span>{"\n              "}</span>{"\n              "}<span style={{ "width": "80px", "flex": "none", "textAlign": "right", "font": "400 11.5px/1.4 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{"—"}</span>{"\n              "}<span style={{ "width": "76px", "flex": "none", "textAlign": "right", "font": "400 11.5px/1.4 'IBM Plex Mono',monospace", "color": "#b0431a" }}>{"—"}</span>{"\n            "}</div>{"\n            "}<div style={{ "display": "flex", "alignItems": "center", "gap": "11px", "borderTop": "1px solid #e4e3e0", "paddingTop": "9px", "marginTop": "2px" }}>{"\n              "}<span style={{ "width": "196px", "flex": "none", "font": "500 11.5px/1.4 'Inter',sans-serif", "color": "#1c1f23" }}>{"Total"}</span>{"\n              "}<span style={{ "flex": "1" }}></span>{"\n              "}<span style={{ "width": "80px", "flex": "none", "textAlign": "right", "font": "500 12px/1.4 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{formatCurrencyNullable(object.amount, object.currency)}</span>{"\n              "}<span style={{ "width": "76px", "flex": "none", "textAlign": "right", "font": "500 12px/1.4 'IBM Plex Mono',monospace", "color": "#1a6b43" }}>{"Unavailable"}</span>{"\n            "}</div>{"\n          "}</div>{"\n          "}<div style={{ "width": "210px", "flex": "none", "background": "#f4f3f1", "borderRadius": "10px", "padding": "11px 12px" }}>{"\n            "}<div style={{ "font": "400 9.5px/1 'IBM Plex Mono',monospace", "letterSpacing": ".05em", "color": "#64686d" }}>{"IF THIS IS REFUNDED IN FULL"}</div>{"\n            "}<div style={{ "font": "400 19px/1 'IBM Plex Mono',monospace", "color": "#b0431a", "marginTop": "9px" }}>{formatCurrencyNullable(object.amount, object.currency)}</div>{"\n            "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "8px" }}>{"Total order margin: "}<span style={{ "color": "#1c1f23" }}>{"Unavailable"}</span>{". Shipping costs and complete cost coverage are not available here; no total margin is inferred."}</div>{"\n          "}</div></div>{"\n        "}</div>);
}

function ItemsPanel({ object }: { object: ObjectSummary }) {
  if (!object.items.length) return <MissingRecordSection object={object} section="items" fallback="Line-item availability is unavailable."/>;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px 48px 92px', gap: 12, paddingBottom: 7 }}>
        {['ITEM', 'SKU', 'QTY', 'TOTAL'].map((label, index) => <span key={label} style={{ textAlign: index > 1 ? 'right' : 'left', color: '#64686d', font: "400 9.5px/1 'Inter',sans-serif", letterSpacing: '.06em' }}>{label}</span>)}
      </div>
      {object.items.map((item, index) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px 48px 92px', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: '1px solid #f4f2ef' }}><OrderItemName item={item}/><span style={{ color: '#64686d', font: "400 11px/1.4 'IBM Plex Mono',monospace" }}>{item.sku ?? 'Unavailable'}</span><span style={{ textAlign: 'right', color: '#1c1f23', font: "400 11.5px/1.4 'IBM Plex Mono',monospace" }}>{item.quantity ?? '—'}</span><span style={{ textAlign: 'right', color: '#1c1f23', font: "400 11.5px/1.4 'IBM Plex Mono',monospace" }}>{item.amount == null ? 'Unavailable' : formatCurrencyNullable(item.amount, item.currency)}</span><span style={{ display: 'none' }}>{index}</span></div>)}
    </div>
  );
}

function ConversationPanel({ object }: { object: ObjectSummary }) {
  if (!object.conversation.length) return <MissingRecordSection object={object} section="conversation" fallback="Conversation availability is unavailable."/>;
  return <div>{object.conversation.map((entry, index) => <article key={entry.id} style={{ display: 'flex', gap: 11, padding: '9px 0', borderTop: index ? '1px solid #f4f2ef' : 0 }}><span style={{ width: 74, flex: '0 0 74px', color: '#64686d', font: "400 10px/1.45 'IBM Plex Mono',monospace" }}>{entry.at ? formatDateTime(entry.at) : 'Time unavailable'}</span><span style={{ width: 7, height: 7, flex: '0 0 7px', marginTop: 5, borderRadius: '50%', background: entry.kind === 'message' ? '#1c1f23' : '#c98a1a' }}/><div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', color: '#1c1f23', font: "500 12px/1.4 'Inter',sans-serif" }}>{entry.actor ?? human(entry.kind)}</strong><p style={{ margin: '2px 0 0', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{entry.summary ?? entry.title}</p></div><span style={{ color: '#64686d', font: "400 9.5px/1.5 'IBM Plex Mono',monospace" }}>{entry.visibility ? human(entry.visibility) : 'Source'}</span></article>)}</div>;
}

function EvidencePanel({ object }: { object: ObjectSummary }) {
  if (!object.evidence.length) return <MissingRecordSection object={object} section="evidence" fallback="Evidence availability is unavailable."/>;
  return <div>{object.evidence.map((entry, index) => <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 128px 88px', gap: 12, alignItems: 'center', padding: '9px 0', borderTop: index ? '1px solid #f4f2ef' : 0 }}><span><strong style={{ display: 'block', color: '#1c1f23', font: "500 12px/1.4 'Inter',sans-serif" }}>{entry.title}</strong><small style={{ display: 'block', marginTop: 2, color: '#64686d', font: "400 10.5px/1.4 'Inter',sans-serif" }}>{entry.summary}</small></span><span style={{ color: '#64686d', font: "400 10.5px/1.4 'IBM Plex Mono',monospace" }}>{human(entry.provider)}</span><span style={{ padding: '2px 7px', borderRadius: 5, background: '#f4f3f1', color: '#40454a', font: "500 9.5px/1.5 'Inter',sans-serif", textAlign: 'center', textTransform: 'uppercase' }}>{human(entry.confidence)}</span></div>)}</div>;
}

function CustodyPanel({ object }: { object: ObjectSummary }) {
  if (!object.custodyLegs?.length) return <MissingRecordSection object={object} section="custody" fallback="Tracking-scan availability is unavailable."/>;
  return <div>{object.custodyLegs.map((leg, index) => <div key={leg.id} style={{ display: 'grid', gridTemplateColumns: '84px 7px minmax(0,1fr) 96px', gap: 11, alignItems: 'start', padding: '9px 0', borderTop: index ? '1px solid #f4f2ef' : 0 }}><span style={{ color: '#64686d', font: "400 10px/1.45 'IBM Plex Mono',monospace" }}>{leg.startedAt ? formatDateTime(leg.startedAt) : 'Time unavailable'}</span><span style={{ width: 7, height: 7, marginTop: 5, borderRadius: '50%', background: leg.witnessed ? '#1a6b43' : '#c98a1a' }}/><span><strong style={{ display: 'block', color: '#1c1f23', font: "500 12px/1.4 'Inter',sans-serif" }}>{leg.location ?? 'Location unavailable'}</strong><small style={{ color: '#64686d', font: "400 10.5px/1.45 'Inter',sans-serif" }}>{leg.status ? human(leg.status) : 'Status unavailable'}</small></span><span style={{ color: leg.witnessed ? '#1a6b43' : '#7a5310', font: "400 10px/1.4 'Inter',sans-serif", textAlign: 'right' }}>{leg.witnessed ? 'Source witnessed' : 'Not witnessed'}</span></div>)}</div>;
}

function AnalysisPanel({ object }: { object: ObjectSummary }) {
  if (object.type === 'ticket') {
    const response = object.responseTimes;
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>{[['MEDIAN OBSERVED REPLY', response?.medianMs == null ? 'Unavailable' : `${Math.round(response.medianMs / 60_000)} minutes`], ['OBSERVED REPLIES', response ? formatNumber(response.responses.length) : 'Unavailable'], ['LAST OBSERVED MESSAGE', response?.latestObservedAt ? formatDateTime(response.latestObservedAt) : 'Unavailable']].map(([label, value]) => <div key={label} style={{ padding: '11px 12px', borderRadius: 9, background: '#f4f3f1' }}><div style={{ color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em' }}>{label}</div><div style={{ marginTop: 7, color: '#1c1f23', font: "400 13px/1.3 'IBM Plex Mono',monospace" }}>{value}</div></div>)}</div>;
  }
  if (object.type === 'dispute') {
    const clock = object.disputeCountdown;
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>{[['ELAPSED', clock?.state === 'available' ? `${clock.elapsedDays} days` : 'Unavailable'], ['REMAINING', clock?.state === 'available' && clock.remainingDays != null ? `${clock.remainingDays} days` : 'Unavailable'], ['DEADLINE', clock?.state === 'available' && clock.deadlineAt ? formatDateTime(clock.deadlineAt) : 'Unavailable'], ['AT STAKE', object.amount == null ? 'Unavailable' : formatCurrencyNullable(object.amount, object.currency)]].map(([label, value], index) => <div key={label} style={{ padding: '11px 12px', borderRadius: 9, background: '#f4f3f1' }}><div style={{ color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em' }}>{label}</div><div style={{ marginTop: 7, color: index === 1 ? '#b0431a' : '#1c1f23', font: "400 13px/1.3 'IBM Plex Mono',monospace" }}>{value}</div></div>)}</div>;
  }
  if (object.type === 'shipment') return <CustodyPanel object={object}/>;
  if (object.items.length) {
    return <div>{object.items.map((item, index) => { const total = item.amount; const margin = item.marginState === 'available' ? formatMinorCurrencyNullable(item.marginMinor ?? null, item.currency) : 'Margin unavailable'; const width = item.marginRatePercent == null ? 0 : Math.max(0, Math.min(100, item.marginRatePercent)); return <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 0', borderTop: index ? '1px solid #f4f2ef' : 0 }}><span style={{ width: 196, flex: '0 0 196px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', font: "400 11.5px/1.4 'Inter',sans-serif" }}>{item.title}</span><span style={{ flex: 1, height: 9, overflow: 'hidden', borderRadius: 2, background: '#e0d9d0' }}><span style={{ width: `${width}%`, height: '100%', display: 'block', background: '#1a6b43' }}/></span><span style={{ width: 84, textAlign: 'right', color: '#1c1f23', font: "400 11px/1.4 'IBM Plex Mono',monospace" }}>{total == null ? 'Unavailable' : formatCurrencyNullable(total, item.currency)}</span><span style={{ width: 94, textAlign: 'right', color: item.marginState === 'available' ? '#1a6b43' : '#64686d', font: "400 10.5px/1.4 'IBM Plex Mono',monospace" }}>{margin}</span></div>; })}</div>;
  }
  return <EmptyRecord>The source did not provide enough line-level data for this comparison.</EmptyRecord>;
}

function OrderLifecycle({ object, source }: { object: ObjectSummary; source: string }) {
  return (<div style={{ "background": "#ffffff", "borderRadius": "10px", "boxShadow": "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)", "padding": "12px 16px 10px", "flex": "none" }}>{"\n          "}<div style={{ "display": "flex", "alignItems": "baseline", "gap": "10px", "paddingBottom": "4px" }}>{"\n            "}<span style={{ "flex": "1", "font": "600 10.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d" }}>{"ORDER LIFECYCLE"}</span>{"\n            "}<span style={{ "font": "400 10.5px/1 'IBM Plex Mono',monospace", "color": "#64686d" }}>{"every line is a source event, not an inference"}</span>{"\n          "}</div>{"\n            "}{object.timeline.length ? object.timeline.map((event, index) => (<div key={`${event.label}-${index}`} style={{ "display": "flex", "gap": "11px", "padding": "9px 0", borderTop: index ? "1px solid #f4f2ef" : undefined }}>{"\n              "}<span style={{ "width": "74px", "flex": "none", "font": "400 10.5px/1.5 'IBM Plex Mono',monospace", "color": "#64686d" }}>{event.at ? formatDateTime(event.at).replace(',', '') : 'Time unavailable'}</span>{"\n              "}<span style={{ "width": "7px", "height": "7px", "flex": "none", "borderRadius": "50%", "background": /cancel|fail/i.test(event.label) ? "#b0431a" : "#1a7f4b", "marginTop": "5px" }}></span>{"\n              "}<div style={{ "flex": "1", "minWidth": "0" }}>{"\n                "}<div style={{ "font": "500 12px/1.4 'Inter',sans-serif", "color": "#1c1f23" }}>{event.label}</div>{"\n                "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "marginTop": "2px" }}>{event.detail ? human(event.detail) : 'Details unavailable'}</div>{"\n              "}</div>{"\n              "}<span style={{ "flex": "none", "font": "400 9.5px/1.5 'IBM Plex Mono',monospace", "color": "#64686d", "paddingTop": "2px" }}>{source.toLowerCase()}</span>{"\n            "}</div>)) : <EmptyRecord>No lifecycle events were returned by the source.</EmptyRecord>}{"\n            "}{"\n            "}{"\n            "}{"\n            "}{"\n            "}{"\n        "}</div>);
}

function OrderContext({ object, source, connectedLinks, backLink }: { object: ObjectSummary; source: string; connectedLinks: ObjectLink[]; backLink: ConnectedObjectBackLink }) {
  return (<div style={{ "width": "300px", "flex": "none", "background": "#f4f3f1", "borderRadius": "13px", "padding": "12px 13px", "display": "flex", "flexDirection": "column", "gap": "11px" }}>{"\n        "}<div style={{ "font": "600 10.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d" }}>{"CONNECTED RECORDS"}</div>{"\n        "}<div style={{ "background": "#ffffff", "borderRadius": "10px", "boxShadow": "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)", "padding": "3px 13px 9px", "display": "flex", "flexDirection": "column" }}>{"\n          "}{connectedLinks.length ? connectedLinks.map((linked) => (<div key={objectLinkIdentity(linked)} style={{ "display": "flex", "alignItems": "center", "gap": "9px", "padding": "9px 0", "borderTop": "1px solid #f4f2ef" }}>{"\n            "}<div style={{ "flex": "1", "minWidth": "0" }}>{"\n              "}<div style={{ "font": "400 10px/1.4 'IBM Plex Mono',monospace", "color": "#64686d" }}>{(linked.role ? human(linked.role) : human(linked.type)).toUpperCase()}</div>{"\n              "}<div style={{ "font": "500 11.5px/1.4 'Inter',sans-serif", "color": "#1c1f23", "marginTop": "2px" }}><Link href={linked.href} style={{ "color": "inherit" }}>{objectDisplayRef(linked.type, linked.reference, linked.id)}</Link></div>{"\n            "}</div>{"\n            "}<span style={{ "flex": "none", "padding": "2px 6px", "borderRadius": "5px", "background": /open|fail/i.test(linked.state ?? "") ? "#fdf0e6" : "#f4f3f1", "font": "500 9.5px/1.5 'Inter',sans-serif", "color": /open|fail/i.test(linked.state ?? "") ? "#b0431a" : "#40454a" }}>{linked.state ? human(linked.state).toUpperCase() : '—'}</span>{"\n          "}</div>)) : <EmptyRecord>No connected records are available.</EmptyRecord>}{"\n          "}{"\n          "}{"\n          "}{"\n          "}{"\n        "}</div>{"\n        "}<div style={{ "font": "600 10.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d", "paddingTop": "2px" }}>{"SOURCE AND FRESHNESS"}</div>{"\n        "}<div style={{ "background": "#ffffff", "borderRadius": "10px", "boxShadow": "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)", "padding": "12px 13px", "display": "flex", "flexDirection": "column", "gap": "8px" }}>{"\n          "}<div style={{ "display": "flex", "alignItems": "baseline", "gap": "8px" }}><span style={{ "flex": "1", "font": "400 11.5px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{"Source"}</span><span style={{ "font": "400 11.5px/1.5 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{object.provenance?.sourceUrl ? <a href={object.provenance.sourceUrl} target="_blank" rel="noreferrer">{human(source)}</a> : human(source)}</span></div><div style={{ "display": "flex", "alignItems": "baseline", "gap": "8px" }}><span style={{ "flex": "1", "font": "400 11.5px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{"Last successful import"}</span><span style={{ "font": "400 11.5px/1.5 'IBM Plex Mono',monospace", "color": "#1a6b43" }}>{object.provenance?.lastSyncedAt ? formatDateTime(object.provenance.lastSyncedAt).replace(',', '') : 'Unavailable'}</span></div><div style={{ "display": "flex", "alignItems": "baseline", "gap": "8px" }}><span style={{ "flex": "1", "font": "400 11.5px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{"Record last changed"}</span><span style={{ "font": "400 11.5px/1.5 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{object.provenance?.sourceUpdatedAt ? formatDateTime(object.provenance.sourceUpdatedAt).replace(',', '') : 'Unavailable'}</span></div><div style={{ "display": "flex", "alignItems": "baseline", "gap": "8px" }}><span style={{ "flex": "1", "font": "400 11.5px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{"Coverage"}</span><span style={{ "font": "400 11.5px/1.5 'IBM Plex Mono',monospace", "color": "#1c1f23" }}>{'Coverage unavailable'}</span></div>{"\n        "}</div>{"\n        "}<div style={{ "font": "600 10.5px/1 'Inter',sans-serif", "letterSpacing": ".09em", "color": "#64686d", "paddingTop": "2px" }}>{"WHAT THIS RECORD IS NOT"}</div>{"\n        "}<div style={{ "background": "#ffffff", "borderRadius": "10px", "boxShadow": "0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)", "padding": "12px 13px", "font": "400 11.5px/1.5 'Inter',sans-serif", "color": "#64686d" }}>{TYPE_COPY.order.not.replace('Shopify', human(source))}</div>{"\n        "}<div style={{ "flex": "1" }}></div>{"\n        "}<div style={{ "font": "400 11px/1.5 'Inter',sans-serif", "color": "#64686d", "borderTop": "1px solid #e4e3e0", "paddingTop": "10px" }}><Link href={backLink.href}>{backLink.label}</Link>{" · this source record remains separately addressable."}</div>{"\n      "}</div>);
}

function LifecyclePanel({ object, source }: { object: ObjectSummary; source: string }) {
  if (!object.timeline.length) return <EmptyRecord>No lifecycle events were returned by the source.</EmptyRecord>;
  return <div>{object.timeline.map((event, index) => <div key={`${event.label}-${event.at ?? index}`} style={{ display: 'flex', gap: 11, padding: '9px 0', borderTop: index ? '1px solid #f4f2ef' : 0 }}><span style={{ width: 82, flex: '0 0 82px', color: '#64686d', font: "400 10px/1.5 'IBM Plex Mono',monospace" }}>{event.at ? formatDateTime(event.at) : 'Time unavailable'}</span><span style={{ width: 7, height: 7, flex: '0 0 7px', marginTop: 5, borderRadius: '50%', background: index === object.timeline.length - 1 ? '#c98a1a' : '#1a6b43' }}/><div style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', color: '#1c1f23', font: "500 12px/1.4 'Inter',sans-serif" }}>{event.label}</strong>{event.detail ? <small style={{ display: 'block', marginTop: 2, color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{human(event.detail)}</small> : null}</div><span style={{ color: '#64686d', font: "400 9.5px/1.5 'IBM Plex Mono',monospace" }}>{human(source)}</span></div>)}</div>;
}

export function ConnectedObjectDetail({ object, returnTo }: { object: ObjectSummary; returnTo?: string }) {
  const copy = TYPE_COPY[object.type];
  const source = object.provenance?.sourceSystem ?? object.provider ?? 'Connected source';
  const updated = object.provenance?.sourceUpdatedAt ?? object.provenance?.lastSyncedAt ?? object.updatedAt;
  const connectedLinks = uniqueObjectLinks([...(object.customer ? [object.customer] : []), ...object.connected, ...object.payoutCases]);
  const backLink = resolveConnectedObjectBackLink(object, returnTo);
  const title = titleFor(object);
  const status = object.state ? human(object.state) : 'State unavailable';
  const statusAttention = /stale|dispute|fail|open|pending|due/i.test(object.state ?? '');
  const facts: ObjectFact[] = [
    ...object.facts,
    ...(object.amount != null ? [{ label: 'Amount', value: object.amount, kind: 'money' as const, currency: object.currency }] : []),
  ].slice(0, 5);
  while (facts.length < 5) facts.push({ label: ['Source', 'Reference', 'Updated', 'Currency', 'Status'][facts.length] ?? 'Source fact', value: [source, title, updated, object.currency, status][facts.length] ?? null, kind: facts.length === 2 ? 'date' : 'text' });
  const primaryMeta = object.type === 'ticket' ? `${formatNumber(object.conversation.length)} entries` : object.type === 'shipment' ? `${formatNumber(object.custodyLegs?.length ?? 0)} scans` : object.type === 'dispute' ? `${formatNumber(object.evidence.length)} evidence items` : `${formatNumber(object.items.length)} items`;
  const freshness = object.provenance?.freshness ? human(object.provenance.freshness) : 'Unavailable';
  const breadcrumbDetail = `${human(source)} · ${updated ? formatDateTime(updated) : 'freshness unavailable'} · ${backLink.label.toLowerCase()}`;

  return (
    <>
      <SetBreadcrumbLabel label={title} detail={breadcrumbDetail}/>
        {object.type === 'order' ? <OrderToolbar object={object}/> : <header style={{ height: 54, flex: 'none', padding: '0 22px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #eae8e5' }}>
          <span style={{ padding: '3px 8px', borderRadius: 6, background: statusAttention ? '#fff3e9' : '#eef6f1', color: statusAttention ? '#7a5310' : '#1a6b43', font: "500 10px/1.5 'Inter',sans-serif", letterSpacing: '.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{status}</span>
          <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', font: "500 14.5px/1.2 'Inter',sans-serif" }}>{object.customer?.reference ?? title}</strong>
          <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: "400 12px/1.4 'Inter',sans-serif" }}>{human(object.type)} · {updated ? formatDateTime(updated) : 'source time unavailable'}</span>
          <span style={{ flex: 1 }}/>
          {object.amount != null ? <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><strong style={{ color: '#1c1f23', font: "400 18px/1 'IBM Plex Mono',monospace" }}>{formatCurrencyNullable(object.amount, object.currency)}</strong><span style={{ color: '#64686d', font: "400 11.5px/1 'Inter',sans-serif" }}>{human(object.type)} value</span></span> : null}
        </header>}

        <div data-screen-label={`${human(object.type)} detail`} data-reference-id={sourceIdFor(object)} data-surface-id={`${object.type === 'ticket' ? 'support-ticket' : object.type}-detail`} data-archetype="P7" style={object.type === 'order' ? { flex: '1', minHeight: '0', padding: '16px 22px 20px', display: 'flex', gap: '14px' } : { flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14, overflow: 'hidden' }}>
          <div style={object.type === 'order' ? { flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '12px' } : { flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            {object.type === 'order' ? <OrderFacts object={object}/> : <section style={{ flex: 'none', padding: '13px 16px', display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 16, borderRadius: 12, background: '#f4f3f1' }}>
              {facts.map((fact, index) => <div key={`${fact.label}-${index}`} style={{ minWidth: 0 }}><div style={{ marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: "600 9.5px/1 'Inter',sans-serif", letterSpacing: '.09em', textTransform: 'uppercase' }}>{fact.label}</div><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', font: "400 12px/1.3 'IBM Plex Mono',monospace" }}><FactValue fact={fact}/></div></div>)}
            </section>}

            {object.type === 'order' ? <OrderItemsPanel object={object}/> : <Panel grow>
              <SectionTitle meta={primaryMeta}>{copy.primary}</SectionTitle>
              {object.type === 'ticket' ? <ConversationPanel object={object}/> : object.type === 'shipment' ? <CustodyPanel object={object}/> : object.type === 'dispute' ? <EvidencePanel object={object}/> : <ItemsPanel object={object}/>}
            </Panel>}

            {object.type === 'order' ? <OrderRiskPanel object={object}/> : <Panel>
              <SectionTitle meta={copy.analysisMeta}>{copy.analysis}</SectionTitle>
              <AnalysisPanel object={object}/>
            </Panel>}

            {object.type === 'order' ? <OrderLifecycle object={object} source={source}/> : <Panel>
              <SectionTitle meta="every line is a source event, not an inference">{copy.lifecycle}</SectionTitle>
              <LifecyclePanel object={object} source={source}/>
            </Panel>}
          </div>

          {object.type === 'order' ? <OrderContext object={object} source={source} connectedLinks={connectedLinks} backLink={backLink}/> : <aside aria-label="Connected context" style={{ width: 300, flex: '0 0 300px', minHeight: 0, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 11, overflowY: 'auto', borderRadius: 13, background: '#f4f3f1' }}>
            <h2 style={{ margin: 0, color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>CONNECTED RECORDS</h2>
            <div style={{ padding: '3px 13px 9px', display: 'flex', flexDirection: 'column', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
              {connectedLinks.length ? connectedLinks.map((linked) => <div key={objectLinkIdentity(linked)} style={{ padding: '9px 0', display: 'flex', alignItems: 'center', gap: 9, borderTop: '1px solid #f4f2ef' }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: '#64686d', font: "400 10px/1.4 'IBM Plex Mono',monospace", textTransform: 'uppercase' }}>{linked.role ? human(linked.role) : human(linked.type)}</div><Link href={linked.href} style={{ display: 'block', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', font: "500 11.5px/1.4 'Inter',sans-serif", textDecoration: 'none' }}>{objectDisplayRef(linked.type, linked.reference, linked.id)}</Link></div>{linked.state ? <span style={{ padding: '2px 6px', borderRadius: 5, background: '#f4f3f1', color: '#40454a', font: "500 9.5px/1.5 'Inter',sans-serif", textTransform: 'uppercase' }}>{human(linked.state)}</span> : null}</div>) : <p style={{ margin: '10px 0 4px', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>No connected records are available.</p>}
            </div>

            <h2 style={{ margin: '2px 0 0', color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>SOURCE AND FRESHNESS</h2>
            <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
              {[['Source', human(source)], ['Last successful import', updated ? formatDateTime(updated) : 'Unavailable'], ['Freshness', freshness], ['Sync state', object.provenance?.syncState ? human(object.provenance.syncState) : 'Unavailable']].map(([label, value], index) => <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{label}</span><span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: index === 1 && updated ? '#1a6b43' : '#1c1f23', font: "400 10.5px/1.5 'IBM Plex Mono',monospace" }}>{value}</span></div>)}
              {object.provenance?.sourceUrl ? <a href={object.provenance.sourceUrl} target="_blank" rel="noreferrer" style={{ marginTop: 3, color: '#9f4f08', font: "500 10.5px/1.4 'Inter',sans-serif", textDecoration: 'none' }}>Open source record</a> : null}
            </div>

            <h2 style={{ margin: '2px 0 0', color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>WHAT THIS RECORD IS NOT</h2>
            <p style={{ margin: 0, padding: '12px 13px', borderRadius: 10, background: '#fff', color: '#64686d', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{copy.not}</p>
            <span style={{ flex: 1 }}/>
            <div style={{ paddingTop: 10, borderTop: '1px solid #e4e3e0', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}><Link href={backLink.href} style={{ color: '#9f4f08', textDecoration: 'none' }}>{backLink.label}</Link> · this source record remains separately addressable.</div>
          </aside>}
        </div>
    </>
  );
}
