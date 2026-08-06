"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, ButtonLink, Input, MetadataChip, Select } from "@/components/ui";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { formatNumber } from "@/lib/utils/format";
import { ConnectorRow, type CatalogueRowItem } from "@/components/integrations/ConnectorRow";
import styles from "./IntegrationsWorkspace.module.css";

type IntegrationView = "connected" | "browse";

const ACTION_REQUIRED_BADGES = new Set(["error", "not_syncing", "stale"]);
const WAITING_BADGES = new Set(["sync_pending", "no_data", "verification_unavailable"]);

type IntegrationGroupId = "commerce" | "support" | "fulfilment" | "delivery" | "financial" | "supplemental";

type IntegrationGroup = {
  id: IntegrationGroupId;
  step: number | null;
  label: string;
  title: string;
  description: string;
  evidenceLabel: string;
};

const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    id: "commerce",
    step: 1,
    label: "Commerce",
    title: "Orders and customer account",
    description: "Orders, customers, line items, refunds and original transaction value.",
    evidenceLabel: "Order and account evidence",
  },
  {
    id: "support",
    step: 2,
    label: "Customer support",
    title: "Request and conversation",
    description: "Claim reason, messages, attachments and the outcome the customer requested.",
    evidenceLabel: "Customer request evidence",
  },
  {
    id: "fulfilment",
    step: 3,
    label: "Fulfilment",
    title: "Pick, pack and warehouse",
    description: "Fulfilment handoff, pack records, warehouse events and operational exceptions.",
    evidenceLabel: "Fulfilment evidence",
  },
  {
    id: "delivery",
    step: 4,
    label: "Delivery",
    title: "Tracking and carrier proof",
    description: "Tracking events, delivery status, signatures, photos and carrier outcomes.",
    evidenceLabel: "Delivery evidence",
  },
  {
    id: "financial",
    step: 5,
    label: "Financial",
    title: "Payments and disputes",
    description: "Payment status, disputes, chargebacks and settlement evidence.",
    evidenceLabel: "Financial evidence",
  },
  {
    id: "supplemental",
    step: null,
    label: "Files and custom sources",
    title: "Supplemental records",
    description: "CSV records and merchant-approved documents fill gaps that connected systems cannot.",
    evidenceLabel: "Supplemental evidence",
  },
];

const GROUP_BY_ID = new Map(INTEGRATION_GROUPS.map((group) => [group.id, group]));
const SEQUENCED_GROUPS = INTEGRATION_GROUPS.filter((group) => group.step !== null);

function integrationGroupForItem(item: CatalogueRowItem): IntegrationGroup {
  if (item.id === "csv_import" || item.category === "documents") return GROUP_BY_ID.get("supplemental")!;
  if (item.category === "commerce") return GROUP_BY_ID.get("commerce")!;
  if (item.category === "helpdesk") return GROUP_BY_ID.get("support")!;
  if (item.category === "warehouse_3pl" || item.category === "returns") return GROUP_BY_ID.get("fulfilment")!;
  if (item.category === "carrier" || item.category === "tracking") return GROUP_BY_ID.get("delivery")!;
  return GROUP_BY_ID.get("financial")!;
}

function integrationGroupLabel(value: string) {
  return GROUP_BY_ID.get(value as IntegrationGroupId)?.label ?? value;
}

function isConfigured(item: CatalogueRowItem) {
  return item.connectionCount > 0 || item.connectionId !== null || item.status !== "not_connected";
}

function isActionRequired(item: CatalogueRowItem) {
  return isConfigured(item) && ACTION_REQUIRED_BADGES.has(item.badge);
}

function isWaiting(item: CatalogueRowItem) {
  return isConfigured(item) && WAITING_BADGES.has(item.badge);
}

function matchesQuery(item: CatalogueRowItem, query: string) {
  if (!query.trim()) return true;
  const group = integrationGroupForItem(item);
  const haystack = [item.name, item.description, item.category, item.account ?? "", group.label, group.title, group.description].join(" ").toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function FilterToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  categories,
  showStatus,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  categories: string[];
  showStatus: boolean;
}) {
  return (
    <div className={`${styles.toolbar} ${showStatus ? styles.toolbarWithStatus : styles.toolbarCatalogue}`} role="search">
      <div className={styles.toolbarSearch}>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search integrations or use cases"
          aria-label="Search integrations or use cases"
          className={styles.searchInput}
        />
        <Search
          size={15}
          aria-hidden="true"
          className={styles.searchIcon}
        />
      </div>
      <Select value={category} onChange={(event) => onCategoryChange(event.target.value)} aria-label="Filter by category">
        <option value="all">All categories</option>
        {categories.map((value) => <option key={value} value={value}>{integrationGroupLabel(value)}</option>)}
      </Select>
      {showStatus ? (
        <Select value={status} onChange={(event) => onStatusChange(event.target.value)} aria-label="Filter by connection status">
          <option value="all">All statuses</option>
          <option value="attention">Needs attention</option>
          <option value="waiting">Waiting or checking</option>
          <option value="healthy">Healthy</option>
        </Select>
      ) : null}
    </div>
  );
}

function ConnectionSummary({
  connectedCount,
  attentionCount,
  importedRecords,
  coveredLayers,
}: {
  connectedCount: number;
  attentionCount: number;
  importedRecords: number;
  coveredLayers: number;
}) {
  return (
    <div className={styles.summary}>
      <div className={styles.summaryCopy}>
        <span><strong>{formatNumber(connectedCount)}</strong> connected</span>
        <span><strong>{coveredLayers} of {SEQUENCED_GROUPS.length}</strong> evidence layers covered</span>
        {/* When something needs attention, the banner directly below states
         * the same count with its own action link (T11) — restating it here
         * too made "4 need attention" the same fact in two adjacent regions.
         * The positive state has no banner, so it still says so here. */}
        {attentionCount === 0 ? <span>No active issues</span> : null}
        <span><strong>{formatNumber(importedRecords)}</strong> records indexed</span>
      </div>
      <span className={styles.summaryMeta}>Last successful sync is shown for each account</span>
    </div>
  );
}

function EvidenceStackOverview({ items }: { items: CatalogueRowItem[] }) {
  const coveredLayers = SEQUENCED_GROUPS.filter((group) =>
    items.some((item) => integrationGroupForItem(item).id === group.id && isConfigured(item)),
  ).length;

  return (
    <section className={styles.stackOverview} aria-labelledby="evidence-stack-title">
      <div className={styles.stackHeader}>
        <div>
          <h2 className={styles.stackTitle} id="evidence-stack-title">Evidence coverage sequence</h2>
          <p className={styles.stackDescription}>Unauth assembles the richest case record by joining each operational layer in order.</p>
        </div>
        <span className={styles.stackCoverage}>{coveredLayers} of {SEQUENCED_GROUPS.length} layers connected</span>
      </div>
      <ol className={styles.stackList}>
        {SEQUENCED_GROUPS.map((group) => {
          const groupItems = items.filter((item) => integrationGroupForItem(item).id === group.id);
          const connectedCount = groupItems.filter(isConfigured).length;
          const availableCount = groupItems.filter((item) => item.stage !== "planned").length;
          const state = connectedCount > 0 ? "connected" : availableCount > 0 ? "available" : "planned";
          const stateLabel = connectedCount > 0
            ? `${connectedCount} connected`
            : availableCount > 0
              ? "Not connected"
              : "Planned";
          return (
            <li key={group.id} className={styles.stackStep}>
              <div className={styles.stackStepTopline}>
                <span className={styles.stackNumber}>{group.step}</span>
                <span className={`${styles.stackState} ${styles[`stackState_${state}`]}`}>{stateLabel}</span>
              </div>
              <h3 className={styles.stackStepTitle}>{group.label}</h3>
              <p className={styles.stackStepText}>{group.description}</p>
            </li>
          );
        })}
      </ol>
      <p className={styles.stackNote}>Connect every provider your operation actually uses. Coverage still depends on provider permissions, record freshness and the systems present in each case.</p>
    </section>
  );
}

function GroupHeading({ group, count, suffix }: { group: IntegrationGroup; count: number; suffix: string }) {
  return (
    <header className={styles.surfaceHeader}>
      <div className={styles.groupHeading}>
        {group.step === null ? <span className={styles.groupSupplemental}>Supplemental</span> : <span className={styles.groupNumber}>{group.step}</span>}
        <div>
          <h2 className={styles.surfaceTitle} id={`integration-group-${group.id}`}>{group.title}</h2>
          <p className={styles.surfaceDescription}>{group.description}</p>
        </div>
      </div>
      <span className={styles.surfaceMeta}>{count} {suffix}</span>
    </header>
  );
}

function ConnectedView({ items, allItems, importedRecords }: { items: CatalogueRowItem[]; allItems: CatalogueRowItem[]; importedRecords: number }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const attentionCount = items.filter(isActionRequired).length;
  const categories = useMemo(() => INTEGRATION_GROUPS.filter((group) => items.some((item) => integrationGroupForItem(item).id === group.id)).map((group) => group.id), [items]);
  const coveredLayers = SEQUENCED_GROUPS.filter((group) => items.some((item) => integrationGroupForItem(item).id === group.id)).length;
  const filtered = useMemo(() => items.filter((item) => {
    if (!matchesQuery(item, query)) return false;
    if (category !== "all" && integrationGroupForItem(item).id !== category) return false;
    if (status === "attention" && !isActionRequired(item)) return false;
    if (status === "waiting" && !isWaiting(item)) return false;
    if (status === "healthy" && (isActionRequired(item) || isWaiting(item))) return false;
    return true;
  }), [category, items, query, status]);
  const filteredGroups = INTEGRATION_GROUPS.map((group) => ({
    group,
    items: filtered.filter((item) => integrationGroupForItem(item).id === group.id),
  })).filter((entry) => entry.items.length > 0);

  return (
    <div className={styles.root}>
      <EvidenceStackOverview items={allItems} />
      <ConnectionSummary connectedCount={items.length} attentionCount={attentionCount} importedRecords={importedRecords} coveredLayers={coveredLayers} />
      {attentionCount > 0 ? (
        <div className={styles.attention} role="status">
          <span className={styles.attentionIcon}><AlertTriangle size={15} aria-hidden="true" /></span>
          <div className={styles.attentionBody}>
            <p className={styles.attentionTitle}>{attentionCount} connection{attentionCount === 1 ? "" : "s"} need attention</p>
            <p className={styles.attentionText}>Review stale data, failed imports, or credentials before relying on new case evidence.</p>
          </div>
          <Link href="#connections" className="ua-text-label shrink-0 text-[var(--ua-text-primary)] underline decoration-[var(--ua-border-strong)] underline-offset-2">Review list</Link>
        </div>
      ) : null}
      <FilterToolbar query={query} onQueryChange={setQuery} category={category} onCategoryChange={setCategory} status={status} onStatusChange={setStatus} categories={categories} showStatus />
      <div className={styles.groupList} id="connections">
        {filteredGroups.length ? filteredGroups.map(({ group, items: groupItems }) => (
          <section className={styles.surface} key={group.id} aria-labelledby={`integration-group-${group.id}`}>
            <GroupHeading group={group} count={groupItems.length} suffix={groupItems.length === 1 ? "connection" : "connections"} />
            <div className={styles.tableHeader} aria-hidden="true">
              <span>Integration</span>
              <span>Status</span>
              <span>Data covered</span>
              <span className="text-right">Records</span>
              <span>Last data</span>
              <span />
            </div>
            <ul className={styles.connectionList}>
              {groupItems.map((item) => <ConnectorRow key={item.id} item={item} />)}
            </ul>
          </section>
        )) : <div className={styles.surface}><p className={styles.empty}>No connections match these filters.</p></div>}
      </div>
    </div>
  );
}

function CatalogueCard({ item }: { item: CatalogueRowItem }) {
  const planned = item.stage === "planned";
  const stageLabel = planned ? "Coming soon" : item.stage === "live" ? "Available" : item.stage === "beta" ? "Beta" : "Partial";
  const stageTone = planned ? "neutral" : item.stage === "live" ? "success" : item.stage === "beta" ? "info" : "warning";
  return (
    <article className={styles.catalogueCard}>
      <div className={styles.catalogueHeader}>
        <div className={styles.catalogueIdentity}>
          <ProviderLogo provider={item.id} name={item.name} />
          <div className="min-w-0">
            <h3 className={styles.catalogueName}>{item.name}</h3>
            <p className={styles.catalogueCategory}>{integrationGroupForItem(item).evidenceLabel}</p>
          </div>
        </div>
        <Badge tone={stageTone} variant="subtle" size="sm" dot>
          {stageLabel}
        </Badge>
      </div>
      <p className={styles.catalogueDescription}>{item.description}</p>
      <div className="flex flex-wrap gap-1.5">
        <MetadataChip>{item.authMode === "oauth" ? "OAuth" : "API credentials"}</MetadataChip>
        {item.runtimeVerificationPending && !planned ? <MetadataChip>Runtime verification pending</MetadataChip> : null}
      </div>
      <div className={styles.catalogueFooter}>
        <Link href={`/sources/${item.id}`} className={styles.catalogueSecondary}>View details <ArrowUpRight size={12} className="ml-0.5 inline" aria-hidden="true" /></Link>
        {planned ? (
          <span className="ua-text-metadata">Not available yet</span>
        ) : item.connectEnabled ? (
          <ButtonLink href={`/sources/setup/${item.id}`} size="sm">Connect</ButtonLink>
        ) : (
          <span className="ua-text-metadata">Setup coming soon</span>
        )}
      </div>
    </article>
  );
}

function BrowseView({ items, allItems }: { items: CatalogueRowItem[]; allItems: CatalogueRowItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => INTEGRATION_GROUPS.filter((group) => items.some((item) => integrationGroupForItem(item).id === group.id)).map((group) => group.id), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    if (!matchesQuery(item, query)) return false;
    return category === "all" || integrationGroupForItem(item).id === category;
  }), [category, items, query]);
  const grouped = INTEGRATION_GROUPS.map((group) => {
    const groupItems = filtered.filter((item) => integrationGroupForItem(item).id === group.id);
    return {
      group,
      available: groupItems.filter((item) => item.stage !== "planned"),
      planned: groupItems.filter((item) => item.stage === "planned"),
    };
  }).filter((entry) => entry.available.length > 0 || entry.planned.length > 0);
  const availableCount = filtered.filter((item) => item.stage !== "planned").length;

  return (
    <div className={styles.root}>
      <EvidenceStackOverview items={allItems} />
      <div className={styles.summary}>
        <div className={styles.summaryCopy}>
          <span><strong>{items.length}</strong> integrations across {categories.length} categories</span>
          <span><strong>{availableCount}</strong> available to configure now</span>
        </div>
        <span className={styles.summaryMeta}>Choose the providers used by your operation</span>
      </div>
      <FilterToolbar query={query} onQueryChange={setQuery} category={category} onCategoryChange={setCategory} status="all" onStatusChange={() => undefined} categories={categories} showStatus={false} />
      <div className={styles.groupList}>
        {grouped.length ? grouped.map(({ group, available, planned }) => (
          <section className={styles.surface} key={group.id} aria-labelledby={`integration-group-${group.id}`}>
            <GroupHeading group={group} count={available.length} suffix="available" />
            {available.length ? <div className={styles.cardGrid}>{available.map((item) => <CatalogueCard key={item.id} item={item} />)}</div> : null}
            {planned.length ? (
              <div className={styles.subsection}>
                <div className={styles.subsectionHeader}>
                  <div>
                    <h3 className={styles.subsectionTitle}>Planned for this layer</h3>
                    <p className={styles.subsectionDescription}>Visible for planning, but not yet available to configure.</p>
                  </div>
                  <span className={styles.surfaceMeta}>{planned.length}</span>
                </div>
                <div className={`${styles.cardGrid} ${styles.subsectionGrid}`}>{planned.map((item) => <CatalogueCard key={item.id} item={item} />)}</div>
              </div>
            ) : null}
          </section>
        )) : <div className={styles.surface}><p className={styles.empty}>No integrations match this search.</p></div>}
        <section className={styles.surface} aria-labelledby="custom-sources-title">
          <div className={styles.importCallout}>
            <div className={styles.importCalloutCopy}>
              <h2 className={styles.importCalloutTitle} id="custom-sources-title">Files, documents and custom sources</h2>
              <p className={styles.importCalloutText}>Import CSV records, upload merchant-approved agreements, or configure API access when a connected system cannot provide the evidence.</p>
            </div>
          <ButtonLink href="/sources/imports" variant="secondary" size="sm">Open imports</ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}

export function IntegrationsWorkspace({
  items,
  initialView,
}: {
  items: CatalogueRowItem[];
  initialView: IntegrationView;
}) {
  const connected = items.filter(isConfigured);
  const browse = items.filter((item) => {
    const isPlanned = item.stage === "planned";
    return item.category !== "documents" && (isPlanned || (!isConfigured(item) && !isPlanned));
  });
  const importedRecords = items.reduce((sum, item) => sum + item.importedRecords, 0);
  return initialView === "browse"
    ? <BrowseView items={browse} allItems={items} />
    : <ConnectedView items={connected} allItems={items} importedRecords={importedRecords} />;
}
