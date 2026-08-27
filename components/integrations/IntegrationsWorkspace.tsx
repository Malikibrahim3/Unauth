"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, ButtonLink, Input, MetadataChip, SegmentedControl, Select } from "@/components/ui";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { ConnectorRow } from "@/components/integrations/ConnectorRow";
import type { CatalogueRowItem } from "@/lib/integrations/catalogueView";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import styles from "@/components/sources/SourcesSurface.module.css";
import { ChartFrame } from '@/components/charts/authenticated/ChartFrame';

type IntegrationView = "connected" | "browse";
type GroupId = "commerce" | "support" | "fulfilment" | "delivery" | "financial" | "supplemental";
type Group = { id: GroupId; step: number | null; label: string; title: string; description: string; evidenceLabel: string };

const GROUPS: Group[] = [
  { id: "commerce", step: 1, label: "Commerce", title: "Orders and customer account", description: "Orders, customers, line items, refunds and original transaction value.", evidenceLabel: "Order and account evidence" },
  { id: "support", step: 2, label: "Customer support", title: "Request and conversation", description: "Claim reason, messages, attachments and the requested outcome.", evidenceLabel: "Customer request evidence" },
  { id: "fulfilment", step: 3, label: "Fulfilment", title: "Pick, pack and warehouse", description: "Fulfilment handoff, pack records, warehouse events and exceptions.", evidenceLabel: "Fulfilment evidence" },
  { id: "delivery", step: 4, label: "Delivery", title: "Tracking and carrier proof", description: "Tracking events, delivery status, signatures, photos and carrier outcomes.", evidenceLabel: "Delivery evidence" },
  { id: "financial", step: 5, label: "Financial", title: "Payments and disputes", description: "Payment status, disputes, chargebacks and settlement evidence.", evidenceLabel: "Financial evidence" },
  { id: "supplemental", step: null, label: "Files and custom sources", title: "Supplemental records", description: "CSV records and approved documents fill gaps that connected systems cannot.", evidenceLabel: "Supplemental evidence" },
];

const GROUP_BY_ID = new Map(GROUPS.map((group) => [group.id, group]));
const SEQUENCED_GROUPS = GROUPS.filter((group) => group.step !== null);
const ACTION_REQUIRED = new Set(["error", "not_syncing", "stale"]);
const WAITING = new Set(["sync_pending", "no_data", "verification_unavailable"]);

function groupFor(item: CatalogueRowItem): Group {
  if (item.id === "csv_import" || item.category === "documents") return GROUP_BY_ID.get("supplemental")!;
  if (item.category === "commerce") return GROUP_BY_ID.get("commerce")!;
  if (item.category === "helpdesk") return GROUP_BY_ID.get("support")!;
  if (item.category === "warehouse_3pl" || item.category === "returns") return GROUP_BY_ID.get("fulfilment")!;
  if (item.category === "carrier" || item.category === "tracking") return GROUP_BY_ID.get("delivery")!;
  return GROUP_BY_ID.get("financial")!;
}

function configured(item: CatalogueRowItem) {
  return item.connectionCount > 0 || item.connectionId !== null || item.status !== "not_connected";
}

function matches(item: CatalogueRowItem, query: string) {
  if (!query.trim()) return true;
  const group = groupFor(item);
  return [item.name, item.description, item.category, item.account ?? "", group.label, group.title]
    .join(" ").toLowerCase().includes(query.trim().toLowerCase());
}

function Coverage({ items }: { items: CatalogueRowItem[] }) {
  return (
    <section aria-labelledby="evidence-coverage-title" className={styles.coverage}>
      <div className={styles.coverageIntro}>
        <h2 id="evidence-coverage-title">Evidence coverage sequence</h2>
        <p>Unauth assembles the richest case record by joining each operational layer in order.</p>
      </div>
      {SEQUENCED_GROUPS.map((group) => {
        const connections = items.filter((item) => groupFor(item).id === group.id && configured(item));
        const available = items.some((item) => groupFor(item).id === group.id && item.stage !== "planned");
        return (
          <div className={styles.coverageItem} key={group.id}>
            <div className={styles.coverageTopline}>
              <span className={styles.coverageStep} data-covered={connections.length > 0}>
                {connections.length > 0 ? <Check size={13} aria-hidden="true" /> : group.step}
              </span>
              <Badge tone={connections.length ? "success" : available ? "neutral" : "warning"} variant="subtle" size="sm">
                {connections.length ? `${connections.length} connected` : available ? "Not connected" : "Planned"}
              </Badge>
            </div>
            <h2 className={styles.coverageLabel}>{group.label}</h2>
            <p className={styles.coverageCopy}>{group.description}</p>
          </div>
        );
      })}
      <p className={styles.coverageNote}>Coverage still depends on provider permissions, record freshness and the systems present in each case.</p>
    </section>
  );
}

type TrustState = 'current' | 'partial' | 'stale' | 'missing' | 'unavailable';
type TrustView = 'attention' | 'coverage';
type TrustCell = {
  key: string;
  provider: CatalogueRowItem;
  family: string;
  label: string;
  detail: string;
  state: TrustState;
  reason: string;
  actionLabel: string | null;
  actionHref: string | null;
};

const TRUST_STATE_PRIORITY: Record<TrustState, number> = {
  stale: 0,
  missing: 1,
  partial: 2,
  current: 3,
  unavailable: 4,
};

function capabilityCountLabel(count: number) {
  return `${count} ${count === 1 ? 'capability' : 'capabilities'} enabled`;
}

function providerRecordLabel(count: number, known = true) {
  if (!known) return 'Provider record count unavailable';
  return `${formatNumber(count)} provider ${count === 1 ? 'record' : 'records'} indexed`;
}

function SourceTrustMatrix({ items }: { items: CatalogueRowItem[] }) {
  const providers = items.filter(configured);
  const [view, setView] = useState<TrustView>('attention');
  const familyFor = (value: string) => {
    const id = value.toLowerCase();
    if (id.includes('order')) return 'orders';
    if (id.includes('customer') || id.includes('identity')) return 'customers';
    if (id.includes('refund') || id.includes('return')) return 'refunds';
    if (id.includes('ticket') || id.includes('message') || id.includes('support') || id.includes('conversation')) return 'support';
    if (id.includes('fulfil') || id.includes('warehouse') || id.includes('pack')) return 'fulfilment';
    if (id.includes('track') || id.includes('deliver') || id.includes('shipment') || id.includes('carrier')) return 'delivery';
    if (id.includes('payment') || id.includes('dispute') || id.includes('chargeback')) return 'financial';
    return 'other';
  };
  const familyLabels: Record<string, string> = { orders: 'Orders', customers: 'Customers and identity', refunds: 'Refunds and returns', support: 'Support requests', fulfilment: 'Fulfilment records', delivery: 'Delivery evidence', financial: 'Payments and disputes', other: 'Other evidence' };
  const familyOrder = ['orders', 'customers', 'refunds', 'support', 'fulfilment', 'delivery', 'financial', 'other'];
  const representedFamilies = familyOrder.filter((family) => providers.some((provider) => provider.capabilities.some((capability) => familyFor(`${capability.id} ${capability.description}`) === family)));
  const rows = representedFamilies.map((family) => ({
    key: family,
    label: familyLabels[family],
    cells: providers.map((provider) => {
      const capabilities = provider.capabilities.filter((candidate) => familyFor(`${candidate.id} ${candidate.description}`) === family && candidate.support !== 'unsupported');
      const sourceHref = `/sources/${provider.id}`;
      const base = { key: `${family}-${provider.id}`, provider, family: familyLabels[family], actionHref: sourceHref };
      if (!capabilities.length) return { ...base, label: 'Not supported', detail: 'Not provided', state: 'unavailable' as const, reason: 'This source does not provide this evidence type.', actionLabel: null, actionHref: null };
      if (capabilities.every((capability) => capability.availability === 'not_connected')) return { ...base, label: 'Not connected', detail: `${capabilities.length} supported`, state: 'missing' as const, reason: 'This evidence type is supported, but it is not enabled for the current connection.', actionLabel: 'Review connection' };
      if (ACTION_REQUIRED.has(provider.badge)) {
        if (provider.badge === 'stale') return { ...base, label: 'Stale', detail: 'Freshness expired', state: 'stale' as const, reason: provider.lastError ?? 'The latest provider data is outside its expected freshness window.', actionLabel: 'Review connection' };
        if (provider.badge === 'not_syncing') return { ...base, label: 'Sync stopped', detail: 'Connection attention', state: 'partial' as const, reason: provider.lastError ?? 'The source is connected, but evidence is not syncing.', actionLabel: 'Review connection' };
        return { ...base, label: 'Connection issue', detail: 'Provider attention', state: 'partial' as const, reason: provider.lastError ?? 'The connection reported an error that must be reviewed before this evidence can be relied on.', actionLabel: 'Review connection' };
      }
      const enabled = capabilities.filter((capability) => capability.availability === 'enabled').length;
      if (provider.badge === 'verification_unavailable') return { ...base, label: 'Verification unavailable', detail: capabilityCountLabel(enabled), state: 'partial' as const, reason: 'The capabilities are enabled, but runtime verification is unavailable.', actionLabel: 'Review verification' };
      if (provider.badge === 'sync_pending') return { ...base, label: 'Sync pending', detail: capabilityCountLabel(enabled), state: 'partial' as const, reason: 'The connection is configured and its initial evidence sync is still pending.', actionLabel: 'View source' };
      if (provider.badge === 'no_data') return { ...base, label: 'Waiting for data', detail: capabilityCountLabel(enabled), state: 'partial' as const, reason: 'The capabilities are enabled, but no provider records have been received yet.', actionLabel: 'View source' };
      if (enabled < capabilities.length) return { ...base, label: 'Coverage incomplete', detail: `${enabled} of ${capabilities.length} enabled`, state: 'partial' as const, reason: 'At least one supported capability is not enabled for this connection.', actionLabel: 'Review verification' };
      if (provider.freshness.confidence === 'unavailable') return { ...base, label: 'Available on demand', detail: capabilityCountLabel(enabled), state: 'current' as const, reason: 'These capabilities are available on demand; a periodic freshness timestamp is not measurable.', actionLabel: 'View source' };
      return provider.lastDataReceivedAt
        ? { ...base, label: 'Current', detail: `${enabled} enabled · measured`, state: 'current' as const, reason: 'Capability and provider freshness signals are current.', actionLabel: 'View source' }
        : { ...base, label: 'Waiting for data', detail: capabilityCountLabel(enabled), state: 'partial' as const, reason: 'The capabilities are enabled, but no received-record timestamp is available.', actionLabel: 'View source' };
    }),
  }));
  const cells = rows.flatMap((row) => row.cells) as TrustCell[];
  const firstBlocking = cells.find((cell) => cell.state === 'stale' || cell.state === 'missing' || cell.state === 'partial') ?? cells[0] ?? null;
  const [selectedKey, setSelectedKey] = useState(firstBlocking?.key ?? '');
  const selected = cells.find((cell) => cell.key === selectedKey) ?? firstBlocking;
  const issues = providers.map((provider) => {
    const providerCells = cells
      .filter((cell) => cell.provider.id === provider.id && (cell.state === 'stale' || cell.state === 'missing' || cell.state === 'partial'))
      .sort((left, right) => TRUST_STATE_PRIORITY[left.state] - TRUST_STATE_PRIORITY[right.state]);
    return providerCells.length ? { provider, cells: providerCells, primary: providerCells[0] } : null;
  }).filter((issue): issue is { provider: CatalogueRowItem; cells: TrustCell[]; primary: TrustCell } => issue !== null);

  if (!providers.length) {
    return (
      <section className={styles.sourceFirstUseInstrument} aria-labelledby="source-first-use-title" data-state-id="source-health-first-use">
        <div>
          <p className={styles.sourceFirstUseKicker}>Source health instrument</p>
          <h2 id="source-first-use-title">No connected evidence yet</h2>
        </div>
        <p>Order, customer, support, fulfilment, delivery and payment coverage cannot be measured until at least one source is connected.</p>
        <Link href="/sources/browse" className={styles.actionLink}>Browse source catalogue <ArrowUpRight size={12} aria-hidden="true" /></Link>
      </section>
    );
  }

  return (
    <ChartFrame
      id="source-object-coverage"
      kind="source-trust-matrix"
      question="Can connected sources contribute reliable evidence?"
      summary="Review exceptions first. Open all coverage when you need the complete provider comparison."
      tabs={<SegmentedControl aria-label="Source readiness view" value={view} onValueChange={(value) => setView(value as TrustView)} items={[{ value: 'attention', label: `Needs attention · ${issues.length}` }, { value: 'coverage', label: 'All coverage' }]} />}
      freshness="Catalogue capability and latest recorded connection state"
      compact
    >
      {rows.length ? (
        <>
          {view === 'attention' ? (
            issues.length ? (
              <ul className={styles.trustIssueList} aria-label="Sources needing attention">
                {issues.map(({ provider, cells: providerCells, primary }) => {
                  const families = providerCells.map((cell) => cell.family);
                  const familySummary = families.length <= 3 ? families.join(', ') : `${families.slice(0, 3).join(', ')} +${families.length - 3} more`;
                  return (
                    <li className={styles.trustIssue} data-state={primary.state} key={provider.id}>
                      <div className={styles.trustIssueIdentity}>
                        <ProviderLogo provider={provider.id} name={provider.name} />
                        <div>
                          <Link href={`/sources/${provider.id}`} className={styles.providerLink}>{provider.name}</Link>
                          <p>{provider.account ?? groupFor(provider).label}</p>
                        </div>
                      </div>
                      <div className={styles.trustIssueSummary}>
                        <Badge tone="warning" variant="subtle" size="sm">{primary.label}</Badge>
                        <p>{primary.reason}</p>
                        <small>{families.length} evidence {families.length === 1 ? 'type' : 'types'} affected · {familySummary}</small>
                      </div>
                      <dl className={styles.trustIssueFacts}>
                        <div><dt>Last data</dt><dd>{provider.freshness.confidence === 'unavailable' ? 'Not measurable' : provider.lastDataReceivedAt ? formatDateTime(provider.lastDataReceivedAt) : 'No receipt recorded'}</dd></div>
                        <div><dt>Record scope</dt><dd>Impact unavailable · {providerRecordLabel(provider.importedRecords, provider.importedRecordsKnown !== false)}</dd></div>
                      </dl>
                      {primary.actionHref && primary.actionLabel ? <Link href={primary.actionHref} className={styles.actionLink}>{primary.actionLabel} <ArrowUpRight size={12} aria-hidden="true" /></Link> : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={styles.trustClear} role="status">
                <Check size={16} aria-hidden="true" />
                <div><strong>No source issues need attention</strong><p>Connected evidence is current or available on demand.</p></div>
              </div>
            )
          ) : null}
          {view === 'coverage' && selected ? (
            <section className={styles.matrixInspector} aria-live="polite" aria-label="Selected source trust detail" data-signal-rail="true">
              <div>
                <p className="ua-text-metadata">{selected.provider.name} · {selected.family}</p>
                <h3 className="ua-text-working-title mt-1">{selected.label}: {selected.reason}</h3>
              </div>
              <dl className={styles.matrixFacts}>
                <div><dt>Freshness</dt><dd>{selected.provider.freshness.confidence === 'unavailable' ? 'Not measurable for this delivery model' : selected.provider.lastDataReceivedAt ? `Last data ${formatDateTime(selected.provider.lastDataReceivedAt)}` : 'No data receipt recorded'}</dd></div>
                <div><dt>Record scope</dt><dd>Evidence-type impact unavailable · {providerRecordLabel(selected.provider.importedRecords, selected.provider.importedRecordsKnown !== false)}</dd></div>
              </dl>
              {selected.actionHref && selected.actionLabel ? <Link href={selected.actionHref} className={styles.actionLink}>{selected.actionLabel} <ArrowUpRight size={12} aria-hidden="true" /></Link> : null}
            </section>
          ) : null}
          {view === 'coverage' ? <div className={`${styles.matrixTable} ua-status-matrix`} role="region" aria-label="Complete source coverage" tabIndex={0}>
            <table>
              <thead><tr><th scope="col">Evidence type</th>{providers.map((provider) => <th scope="col" key={provider.id}>{provider.name}</th>)}</tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    {row.cells.map((cell) => (
                      <td key={cell.key}>
                        {cell.state === 'unavailable' ? (
                          <span className={`${styles.matrixCell} ua-status-matrix__cell`} data-state={cell.state} aria-label={`${cell.provider.name} does not support ${cell.family}`}><span>{cell.label}</span><small>{cell.detail}</small></span>
                        ) : (
                          <button type="button" className={`${styles.matrixCell} ua-status-matrix__cell`} data-state={cell.state} data-selected={selected?.key === cell.key} aria-pressed={selected?.key === cell.key} onClick={() => setSelectedKey(cell.key)}>
                            <span>{cell.label}</span><small>{cell.detail}</small>
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : null}
        </>
      ) : <p className={styles.empty}>No connected source capability data is available.</p>}
    </ChartFrame>
  );
}

function Toolbar({ query, category, status, categories, showStatus, onChange }: {
  query: string; category: string; status: string; categories: GroupId[]; showStatus: boolean;
  onChange: (key: "q" | "category" | "status", value: string) => void;
}) {
  return (
    <div className={styles.toolbar} role="search">
      <div className={styles.search}>
        <Search className={styles.searchIcon} size={15} aria-hidden="true" />
        <Input value={query} onChange={(event) => onChange("q", event.target.value)} placeholder="Search providers or data" aria-label="Search providers or data" />
      </div>
      <div className={styles.filters}>
        <Select value={category} onChange={(event) => onChange("category", event.target.value)} aria-label="Filter by evidence layer">
          <option value="all">All evidence layers</option>
          {categories.map((value) => <option value={value} key={value}>{GROUP_BY_ID.get(value)?.label}</option>)}
        </Select>
        {showStatus ? (
          <Select value={status} onChange={(event) => onChange("status", event.target.value)} aria-label="Filter by connection status">
            <option value="all">All statuses</option>
            <option value="attention">Needs attention</option>
            <option value="waiting">Waiting or checking</option>
            <option value="healthy">Healthy</option>
          </Select>
        ) : null}
      </div>
    </div>
  );
}

function GroupHeading({ group, count, suffix }: { group: Group; count: number; suffix: string }) {
  return (
    <header className={styles.sectionTopline}>
      <div>
        <h2 className={styles.sectionTitle} id={`source-group-${group.id}`}>{group.title}</h2>
        <p className={styles.sectionDescription}>{group.description}</p>
      </div>
      <span className="ua-text-metadata tabular-nums">{count} {suffix}</span>
    </header>
  );
}

function CatalogueCard({ item }: { item: CatalogueRowItem }) {
  const planned = item.stage === "planned";
  const stageLabel = planned ? "Planned" : item.stage === "live" ? "Live" : item.stage === "beta" ? "Beta" : "Partial";
  const stageTone = planned ? "neutral" : item.stage === "live" ? "success" : item.stage === "beta" ? "info" : "warning";
  return (
    <article className={styles.catalogueCard} data-source-catalogue-card data-planned={planned} data-state-id={planned ? "planned-connector" : `connector-${item.stage}`}>
      <div className={styles.cardTopline}>
        <div className={styles.cardIdentity}>
          <ProviderLogo provider={item.id} name={item.name} />
          <div className="min-w-0">
            <h3 className={styles.cardTitle}>{item.name}</h3>
            <p className={styles.providerMeta}>{groupFor(item).evidenceLabel}</p>
          </div>
        </div>
        <Badge tone={stageTone} variant="subtle" size="sm" dot>{stageLabel}</Badge>
      </div>
      <p className={styles.cardDescription}>{item.description}</p>
      <div className={styles.cardMeta}>
        <MetadataChip>{item.authMode === "oauth" ? "OAuth" : "API credentials"}</MetadataChip>
        <MetadataChip>{item.capabilities.length} capabilities</MetadataChip>
        {item.runtimeVerificationPending && !planned ? <MetadataChip>Verification pending</MetadataChip> : null}
      </div>
      <footer className={styles.cardFooter}>
        <Link href={`/sources/${item.id}`} className={styles.actionLink}>Details <ArrowUpRight size={12} className="inline" aria-hidden="true" /></Link>
        {planned ? (
          <span className="ua-text-metadata">Setup unavailable</span>
        ) : item.connectEnabled ? (
          <ButtonLink href={`/sources/setup/${item.id}`} size="sm">Connect</ButtonLink>
        ) : (
          <span className="ua-text-metadata">Runtime unavailable</span>
        )}
      </footer>
    </article>
  );
}

const VALID_STATUS_FILTERS = new Set(["all", "attention", "waiting", "healthy"]);

function initialCategoryFilter(value: string | undefined) {
  return GROUP_BY_ID.has(value as GroupId) ? value! : "all";
}

function initialStatusFilter(value: string | undefined) {
  return value && VALID_STATUS_FILTERS.has(value) ? value : "all";
}

export function IntegrationsWorkspace({ items, initialView, initialQuery, initialCategory, initialStatus }: {
  items: CatalogueRowItem[];
  initialView: IntegrationView;
  initialQuery?: string;
  initialCategory?: string;
  initialStatus?: string;
}) {
  const [query, setQuery] = useState(initialQuery ?? "");
  const [category, setCategory] = useState(initialCategoryFilter(initialCategory));
  const [status, setStatus] = useState(initialStatusFilter(initialStatus));
  useEffect(() => {
    function restoreFilters() {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get("q") ?? "");
      setCategory(initialCategoryFilter(params.get("category") ?? undefined));
      setStatus(initialStatusFilter(params.get("status") ?? undefined));
    }
    window.addEventListener("popstate", restoreFilters);
    return () => window.removeEventListener("popstate", restoreFilters);
  }, []);
  const connected = items.filter(configured);
  const browse = items.filter((item) => item.category !== "documents" && (item.stage === "planned" || !configured(item)));
  const visible = initialView === "browse" ? browse : connected;
  const categories = useMemo(() => GROUPS.filter((group) => visible.some((item) => groupFor(item).id === group.id)).map((group) => group.id), [visible]);
  const filtered = useMemo(() => visible.filter((item) => {
    if (!matches(item, query)) return false;
    if (category !== "all" && groupFor(item).id !== category) return false;
    if (initialView === "connected" && status === "attention" && !ACTION_REQUIRED.has(item.badge)) return false;
    if (initialView === "connected" && status === "waiting" && !WAITING.has(item.badge)) return false;
    if (initialView === "connected" && status === "healthy" && (ACTION_REQUIRED.has(item.badge) || WAITING.has(item.badge))) return false;
    return true;
  }), [category, initialView, query, status, visible]);

  function updateFilter(key: "q" | "category" | "status", value: string) {
    if (key === "q") setQuery(value);
    if (key === "category") setCategory(value);
    if (key === "status") setStatus(value);
    if (typeof window === "undefined") return;
    const next = new URLSearchParams(window.location.search);
    if (value && value !== "all") next.set(key, value); else next.delete(key);
    const url = `${window.location.pathname}${next.size ? `?${next.toString()}` : ""}`;
    window.history.replaceState(window.history.state, "", url);
  }

  const configuredLayers = SEQUENCED_GROUPS.filter((group) => items.some((item) => groupFor(item).id === group.id && configured(item))).length;
  const knownRecordSources = connected.filter((item) => item.importedRecordsKnown !== false);
  const importedRecords = knownRecordSources.reduce((sum, item) => sum + item.importedRecords, 0);
  const recordCountPartial = knownRecordSources.length !== connected.length;
  const grouped = GROUPS.map((group) => ({ group, items: filtered.filter((item) => groupFor(item).id === group.id) })).filter((entry) => entry.items.length);

  return (
    <div className={styles.stack} data-state-id={visible.length ? `${initialView}-sources` : initialView === "connected" ? "sources-first-use" : "source-catalogue-empty"}>
      {initialView === 'connected' ? <SourceTrustMatrix items={items} /> : null}
      <Coverage items={items} />
      <div className={styles.summaryBar}>
        <div className={styles.summaryFacts}>
          {initialView === "connected" ? (
            <>
              <span><strong>{connected.length}</strong> connected</span>
              <span><strong>{configuredLayers} of {SEQUENCED_GROUPS.length}</strong> evidence layers covered</span>
              <span><strong>{knownRecordSources.length ? formatNumber(importedRecords) : "Unavailable"}</strong> {recordCountPartial ? "known records · partial count" : "records indexed"}</span>
            </>
          ) : (
            <>
              <span><strong>{browse.length}</strong> providers in catalogue</span>
              <span><strong>{browse.filter((item) => item.stage !== "planned").length}</strong> available now</span>
              <span><strong>{browse.filter((item) => item.stage === "planned").length}</strong> planned</span>
            </>
          )}
        </div>
        <span className="ua-text-metadata">Coverage depends on granted scope, freshness and runtime health.</span>
      </div>
      <Toolbar query={query} category={category} status={status} categories={categories} showStatus={initialView === "connected"} onChange={updateFilter} />

      <div
        className={`${styles.groupList}${initialView === "connected" ? ` ${styles.connectedRegistryScroll}` : ""}`}
        id="source-results"
        role={initialView === "connected" ? "region" : undefined}
        aria-label={initialView === "connected" ? "Connected sources registry" : undefined}
        tabIndex={initialView === "connected" ? 0 : undefined}
      >
        {grouped.length ? grouped.map(({ group, items: groupItems }) => (
          <section className={styles.group} aria-labelledby={`source-group-${group.id}`} key={group.id}>
            <GroupHeading group={group} count={groupItems.length} suffix={initialView === "connected" ? (groupItems.length === 1 ? "connection" : "connections") : "providers"} />
            {initialView === "connected" ? (
              <>
                <div className={styles.tableHeader} aria-hidden="true">
                  <span>Provider</span><span>Status</span><span>Data covered</span><span className="text-right">Records</span><span>Last data</span><span />
                </div>
                <ul className={styles.connectionList}>{groupItems.map((item) => <ConnectorRow item={item} key={item.id} />)}</ul>
              </>
            ) : (
              <>
                {groupItems.some((item) => item.stage !== "planned") ? <div className={styles.catalogueGrid}>{groupItems.filter((item) => item.stage !== "planned").map((item) => <CatalogueCard item={item} key={item.id} />)}</div> : null}
                {groupItems.some((item) => item.stage === "planned") ? (
                  <div className="mt-4 border-t border-[var(--uo-route-border-subtle)] pt-4">
                    <h3 className="ua-text-label">Planned for this layer</h3>
                    <p className={styles.mutedCopy}>Capability and limitations are visible, but setup remains unavailable.</p>
                    <div className={`${styles.catalogueGrid} mt-3`}>{groupItems.filter((item) => item.stage === "planned").map((item) => <CatalogueCard item={item} key={item.id} />)}</div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        )) : (
          <div className={styles.empty} data-state-id="source-no-results">
            <p className="ua-text-working-title">No sources match these filters</p>
            <p className={styles.mutedCopy}>Clear the search or choose a different evidence layer.</p>
            <ButtonLink href={initialView === "connected" ? "/sources/connected" : "/sources/browse"} variant="secondary" size="sm">Clear filters</ButtonLink>
          </div>
        )}
        {initialView === "browse" ? (
          <section className={styles.group} aria-labelledby="custom-source-title">
            <div className={styles.sectionTopline}>
              <div><h2 className={styles.sectionTitle} id="custom-source-title">Files and custom records</h2><p className={styles.sectionDescription}>Bring in approved CSV records when no live connector can provide them.</p></div>
              <ButtonLink href="/sources/imports" variant="secondary" size="sm">Open imports</ButtonLink>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
