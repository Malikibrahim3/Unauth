"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, ButtonLink, Input, MetadataChip, Select } from "@/components/ui";
import { ProviderLogo } from "@/components/identity/ProviderLogo";
import { formatNumber } from "@/lib/utils/format";
import { categoryLabel, ConnectorRow, type CatalogueRowItem } from "@/components/integrations/ConnectorRow";
import styles from "./IntegrationsWorkspace.module.css";

type IntegrationView = "connected" | "browse";

const ACTION_REQUIRED_BADGES = new Set(["error", "not_syncing", "stale"]);
const WAITING_BADGES = new Set(["sync_pending", "no_data", "verification_unavailable"]);

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
  const haystack = [item.name, item.description, item.category, item.account ?? ""].join(" ").toLowerCase();
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
    <div className={styles.toolbar} role="search">
      <div className={styles.toolbarSearch}>
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search integrations or use cases"
          aria-label="Search integrations or use cases"
          style={{ paddingLeft: 34 }}
        />
        <Search
          size={15}
          aria-hidden="true"
          className="pointer-events-none relative -top-[27px] left-3 -mb-4 text-[var(--ua-icon-secondary)]"
        />
      </div>
      <Select value={category} onChange={(event) => onCategoryChange(event.target.value)} aria-label="Filter by category">
        <option value="all">All categories</option>
        {categories.map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}
      </Select>
      {showStatus ? (
        <Select value={status} onChange={(event) => onStatusChange(event.target.value)} aria-label="Filter by connection status">
          <option value="all">All statuses</option>
          <option value="attention">Needs attention</option>
          <option value="waiting">Waiting or checking</option>
          <option value="healthy">Healthy</option>
        </Select>
      ) : (
        <div aria-hidden="true" />
      )}
    </div>
  );
}

function ConnectionSummary({
  connectedCount,
  attentionCount,
  importedRecords,
}: {
  connectedCount: number;
  attentionCount: number;
  importedRecords: number;
}) {
  return (
    <div className={styles.summary}>
      <div className={styles.summaryCopy}>
        <span><strong>{formatNumber(connectedCount)}</strong> connected</span>
        {attentionCount > 0 ? <span><strong>{formatNumber(attentionCount)}</strong> need attention</span> : <span>No active issues</span>}
        <span><strong>{formatNumber(importedRecords)}</strong> records indexed</span>
      </div>
      <span className={styles.summaryMeta}>Health checks update when this page opens</span>
    </div>
  );
}

function ConnectedView({ items, importedRecords }: { items: CatalogueRowItem[]; importedRecords: number }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const attentionCount = items.filter(isActionRequired).length;
  const categories = useMemo(() => [...new Set(items.map((item) => item.category))].sort(), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    if (!matchesQuery(item, query)) return false;
    if (category !== "all" && item.category !== category) return false;
    if (status === "attention" && !isActionRequired(item)) return false;
    if (status === "waiting" && !isWaiting(item)) return false;
    if (status === "healthy" && (isActionRequired(item) || isWaiting(item))) return false;
    return true;
  }), [category, items, query, status]);

  return (
    <div className={styles.root}>
      <ConnectionSummary connectedCount={items.length} attentionCount={attentionCount} importedRecords={importedRecords} />
      {attentionCount > 0 ? (
        <div className={styles.attention} role="status">
          <span className={styles.attentionIcon}><AlertTriangle size={15} aria-hidden="true" /></span>
          <div className={styles.attentionBody}>
            <p className={styles.attentionTitle}>{attentionCount} connection{attentionCount === 1 ? "" : "s"} need attention</p>
            <p className={styles.attentionText}>Review stale data, failed imports, or credentials before relying on new case evidence.</p>
          </div>
          <Link href="#connections" className="shrink-0 text-xs font-semibold text-[var(--ua-text-primary)] underline decoration-[var(--ua-border-strong)] underline-offset-2">Review list</Link>
        </div>
      ) : null}
      <FilterToolbar query={query} onQueryChange={setQuery} category={category} onCategoryChange={setCategory} status={status} onStatusChange={setStatus} categories={categories} showStatus />
      <section className={styles.surface} id="connections" aria-labelledby="connected-title">
        <header className={styles.surfaceHeader}>
          <div>
            <h2 className={styles.surfaceTitle} id="connected-title">Your connections</h2>
            <p className={styles.surfaceDescription}>Manage accounts that already send evidence into Unauth.</p>
          </div>
          <span className={styles.surfaceMeta}>{filtered.length} of {items.length}</span>
        </header>
        {filtered.length ? (
          <>
            <div className={styles.tableHeader} aria-hidden="true">
              <span>Integration</span>
              <span>Status</span>
              <span>Data covered</span>
              <span className="text-right">Records</span>
              <span>Last data</span>
              <span />
            </div>
            <ul className={styles.connectionList}>
              {filtered.map((item) => <ConnectorRow key={item.id} item={item} />)}
            </ul>
          </>
        ) : (
          <p className={styles.empty}>No connections match these filters.</p>
        )}
      </section>
    </div>
  );
}

function CatalogueCard({ item }: { item: CatalogueRowItem }) {
  const planned = item.stage === "planned";
  return (
    <article className={styles.catalogueCard}>
      <div className={styles.catalogueHeader}>
        <div className={styles.catalogueIdentity}>
          <ProviderLogo provider={item.id} name={item.name} />
          <div className="min-w-0">
            <h3 className={styles.catalogueName}>{item.name}</h3>
            <p className={styles.catalogueCategory}>{categoryLabel(item.category)}</p>
          </div>
        </div>
        <Badge tone={planned ? "neutral" : "info"} variant="subtle" size="sm" dot>
          {planned ? "Coming soon" : "Available"}
        </Badge>
      </div>
      <p className={styles.catalogueDescription}>{item.description}</p>
      <div className="flex flex-wrap gap-1.5">
        <MetadataChip>{item.authMode === "oauth" ? "OAuth" : "API credentials"}</MetadataChip>
        {item.runtimeVerificationPending && !planned ? <MetadataChip>Beta</MetadataChip> : null}
      </div>
      <div className={styles.catalogueFooter}>
        <Link href={`/integrations/${item.id}`} className={styles.catalogueSecondary}>View details <ArrowUpRight size={12} className="ml-0.5 inline" aria-hidden="true" /></Link>
        {planned ? (
          <span className="text-xs text-[var(--ua-text-tertiary)]">Not available yet</span>
        ) : item.connectEnabled ? (
          <ButtonLink href={`/integrations/${item.id}`} size="sm">Connect</ButtonLink>
        ) : (
          <span className="text-xs text-[var(--ua-text-tertiary)]">Setup coming soon</span>
        )}
      </div>
    </article>
  );
}

function BrowseView({ items }: { items: CatalogueRowItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => [...new Set(items.map((item) => item.category))].sort(), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    if (!matchesQuery(item, query)) return false;
    return category === "all" || item.category === category;
  }), [category, items, query]);
  const available = filtered.filter((item) => item.stage !== "planned");
  const planned = filtered.filter((item) => item.stage === "planned");

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <div className={styles.summaryCopy}>
          <span><strong>{items.length}</strong> integrations in the catalogue</span>
          <span>Connect a source to start building richer case evidence.</span>
        </div>
        <span className={styles.summaryMeta}>Search by provider or use case</span>
      </div>
      <FilterToolbar query={query} onQueryChange={setQuery} category={category} onCategoryChange={setCategory} status="all" onStatusChange={() => undefined} categories={categories} showStatus={false} />
      <section className={styles.surface} aria-labelledby="browse-title">
        <header className={styles.surfaceHeader}>
          <div>
            <h2 className={styles.surfaceTitle} id="browse-title">Available integrations</h2>
            <p className={styles.surfaceDescription}>Choose the systems that feed orders, support, fulfilment, and carrier evidence into Unauth.</p>
          </div>
          <span className={styles.surfaceMeta}>{available.length} available</span>
        </header>
        {available.length ? <div className={styles.cardGrid}>{available.map((item) => <CatalogueCard key={item.id} item={item} />)}</div> : <p className={styles.empty}>No available integrations match this search.</p>}
        {planned.length ? (
          <div className={styles.subsection}>
            <div className={styles.subsectionHeader}>
              <div>
                <h3 className={styles.subsectionTitle}>Coming soon</h3>
                <p className={styles.subsectionDescription}>Roadmap items are kept separate from connections you can configure today.</p>
              </div>
              <span className={styles.surfaceMeta}>{planned.length}</span>
            </div>
            <div className={styles.cardGrid} style={{ padding: 0 }}>{planned.map((item) => <CatalogueCard key={item.id} item={item} />)}</div>
          </div>
        ) : null}
        <div className={styles.importCallout}>
          <div className={styles.importCalloutCopy}>
            <h3 className={styles.importCalloutTitle}>Need to work from a file or custom source?</h3>
            <p className={styles.importCalloutText}>Import CSV records, upload documents, or configure API access from the imports workspace.</p>
          </div>
          <ButtonLink href="/integrations/imports" variant="secondary" size="sm">Open imports &amp; API</ButtonLink>
        </div>
      </section>
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
  const browse = items.filter((item) => !isConfigured(item) && item.category !== "documents");
  const importedRecords = items.reduce((sum, item) => sum + item.importedRecords, 0);
  return initialView === "browse" ? <BrowseView items={browse} /> : <ConnectedView items={connected} importedRecords={importedRecords} />;
}
