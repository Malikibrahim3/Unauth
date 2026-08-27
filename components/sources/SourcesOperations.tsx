'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CircleAlert,
  Clock3,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ProviderLogo } from '@/components/identity/ProviderLogo';
import type { CatalogueRowItem } from '@/lib/integrations/catalogueView';
import { Input, Select } from '@/components/ui';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import {
  evidenceStatesForSource,
  evaluateSourceReadiness,
  isSourceConfigured,
  REQUIRED_EVIDENCE_LAYERS,
  sourceEvidenceLayerIds,
  sourceStatus,
  type LayerReadiness,
  type ReadinessSource,
  type RequiredEvidenceLayerId,
} from '@/lib/sources/evidenceReadiness';
import styles from './SourcesOperations.module.css';

export type SourcesView = 'connected' | 'browse';
export type SourceStatusFilter = 'all' | 'connected' | 'not_connected' | 'attention' | 'planned';
export type SourceLayerFilter = 'all' | RequiredEvidenceLayerId | 'supplemental';

type CatalogueGroupId = SourceLayerFilter;
type SourceTaskGroupId = 'needs_attention' | 'working' | 'ready_to_connect' | 'not_available';
type Tone = 'positive' | 'warning' | 'critical' | 'info' | 'neutral';

const TASK_GROUPS: Array<{ id: SourceTaskGroupId; title: string; description: string }> = [
  { id: 'needs_attention', title: 'Needs attention', description: 'Configured sources whose health, permissions, freshness, or first data need an operator.' },
  { id: 'working', title: 'Working', description: 'Configured sources currently usable by this workspace. Returned data and freshness remain explicit per source.' },
  { id: 'ready_to_connect', title: 'Ready to connect', description: 'Implemented providers that this workspace has not configured yet.' },
  { id: 'not_available', title: 'Not available yet', description: 'Catalogue capability only. No connection, health, freshness, or returned records are implied.' },
];

const CATALOGUE_GROUPS: Array<{
  id: CatalogueGroupId;
  title: string;
  description: string;
}> = [
  { id: 'commerce', title: 'Commerce and orders', description: 'Order and customer records that establish what was purchased and what was paid.' },
  { id: 'support', title: 'Customer support', description: 'The request, conversation, and attachments behind a customer claim.' },
  { id: 'fulfilment', title: 'Fulfilment / 3PL', description: 'Pick, pack, warehouse, and fulfilment exception evidence.' },
  { id: 'delivery', title: 'Delivery and carrier evidence', description: 'Tracking events, delivery outcomes, and carrier proof.' },
  { id: 'payments', title: 'Payments and disputes', description: 'Payment, dispute, chargeback, and settlement evidence.' },
  { id: 'supplemental', title: 'Supplemental and manual evidence', description: 'Optional files and manual records that fill gaps in connected systems.' },
];

const EVIDENCE_LABELS: Record<string, string> = {
  order_value: 'Order value',
  line_items: 'Line items',
  customer_history: 'Customer history',
  refund_history: 'Refund history',
  reship_history: 'Reship history',
  ticket_messages: 'Ticket messages',
  ticket_attachments: 'Ticket attachments',
  customer_claim_reason: 'Claim reason',
  requested_action: 'Requested action',
  warehouse_pick_pack: 'Pick / pack',
  warehouse_exception: 'Warehouse exceptions',
  three_pl_sla_claim_status: '3PL SLA status',
  self_reported_pack_confirmation: 'Pack confirmation',
  self_reported_pack_photo: 'Pack photo',
  tracking_number: 'Tracking number',
  tracking_events: 'Tracking events',
  delivery_status: 'Delivery status',
  delivery_photo: 'Delivery photo',
  signature: 'Signature',
  carrier_claim_submission_status: 'Carrier claim status',
  carrier_claim_outcome: 'Carrier claim outcome',
  dispute_status: 'Dispute status',
  chargeback_evidence: 'Chargeback evidence',
  contract_terms: 'Contract terms',
  recovery_deadline: 'Recovery deadline',
  return_request_status: 'Return request',
  return_inspection_outcome: 'Return inspection',
};

function asReadinessSource(item: CatalogueRowItem): ReadinessSource {
  return item;
}

function groupFor(item: CatalogueRowItem): CatalogueGroupId {
  if (item.id === 'csv_import' || item.category === 'documents') return 'supplemental';
  const layer = sourceEvidenceLayerIds(asReadinessSource(item))[0];
  if (layer) return layer;
  if (item.category === 'commerce') return 'commerce';
  if (item.category === 'helpdesk') return 'support';
  if (item.category === 'warehouse_3pl' || item.category === 'returns') return 'fulfilment';
  if (item.category === 'carrier' || item.category === 'tracking') return 'delivery';
  if (item.category === 'payments_disputes') return 'payments';
  return 'supplemental';
}

function layerNamesFor(item: CatalogueRowItem): string[] {
  const names = sourceEvidenceLayerIds(asReadinessSource(item))
    .map((id) => REQUIRED_EVIDENCE_LAYERS.find((layer) => layer.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  if (item.id === 'csv_import' || item.category === 'documents') names.push('Supplemental and manual evidence');
  return [...new Set(names)];
}

function humaniseEvidence(id: string): string {
  return EVIDENCE_LABELS[id] ?? id.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function maturityFor(item: CatalogueRowItem): { label: string; tone: Tone } {
  if (item.stage === 'planned') return { label: 'Not available', tone: 'neutral' };
  if (item.stage === 'beta') return { label: 'Beta', tone: 'info' };
  if (item.stage === 'partial') return { label: 'Partial', tone: 'warning' };
  return { label: 'Available', tone: 'positive' };
}

function connectionStateFor(item: CatalogueRowItem): { label: string; tone: Tone } {
  if (item.stage === 'planned') return { label: 'Not available', tone: 'neutral' };
  if (!isSourceConfigured(asReadinessSource(item))) return { label: 'Not connected', tone: 'neutral' };
  if (item.badge === 'sync_pending' || item.syncState === 'importing' || item.syncState === 'import_queued') return { label: 'Syncing', tone: 'info' };
  if (item.badge === 'no_data' || item.syncState === 'no_records_found') return { label: 'Waiting for first data', tone: 'warning' };
  if (item.badge === 'stale' || item.syncState === 'stale') return { label: 'Stale', tone: 'warning' };
  if (item.badge === 'error' || item.badge === 'not_syncing' || item.badge === 'verification_unavailable' || item.syncState === 'sync_failed' || item.syncState === 'attention_required') {
    return { label: 'Needs attention', tone: 'critical' };
  }
  return { label: 'Connected', tone: 'positive' };
}

function taskGroupFor(item: CatalogueRowItem): SourceTaskGroupId {
  if (item.stage === 'planned') return 'not_available';
  if (!isSourceConfigured(asReadinessSource(item))) return item.connectEnabled ? 'ready_to_connect' : 'not_available';
  const state = connectionStateFor(item).label;
  if (state === 'Needs attention' || state === 'Stale' || state === 'Waiting for first data') return 'needs_attention';
  return 'working';
}

function taskReason(item: CatalogueRowItem): string {
  const group = taskGroupFor(item);
  if (group === 'needs_attention') return item.lastError ?? `${connectionStateFor(item).label}. Review the source detail for the exact recovery step.`;
  if (group === 'working') return `${connectionStateFor(item).label}. ${recordLabel(item)} returned records; freshness is ${freshnessLabel(item).toLowerCase()}.`;
  if (group === 'ready_to_connect') return item.connectEnabled ? 'Provider setup is available for this workspace.' : 'Connection controls are not implemented.';
  return 'Connection is not implemented. No workspace source state is asserted.';
}

function freshnessLabel(item: CatalogueRowItem): string {
  const state = connectionStateFor(item).label;
  if (state === 'Stale') return 'Stale';
  if (state === 'Waiting for first data') return 'Waiting for first data';
  if (item.freshness.confidence === 'unavailable') return 'Not measurable';
  if (item.lastDataReceivedAt) return 'Measured';
  return 'Not recorded';
}

function lastDataLabel(item: CatalogueRowItem): string {
  if (item.lastDataReceivedAt) return formatDateTime(item.lastDataReceivedAt);
  if (item.freshness.confidence === 'unavailable') return 'Not measurable';
  if (item.badge === 'sync_pending' || item.badge === 'no_data') return 'Waiting for first data';
  return 'Not recorded';
}

function recordLabel(item: CatalogueRowItem): string {
  if (item.importedRecordsKnown === false) return 'Unavailable';
  return formatNumber(item.importedRecords);
}

function setupHref(item: CatalogueRowItem): string {
  if (item.id === 'csv_import') return '/sources/imports';
  if (item.id === 'document_upload') return '/settings/legal/agreements';
  return `/sources/setup/${item.id}`;
}

function actionLabel(item: CatalogueRowItem): string {
  if (item.stage === 'planned') return 'View details';
  if (isSourceConfigured(asReadinessSource(item))) return connectionStateFor(item).label === 'Needs attention' ? 'Resolve issue' : 'Manage';
  return item.connectEnabled ? 'Connect' : 'View details';
}

function actionHref(item: CatalogueRowItem): string {
  if (item.stage === 'planned' || !isSourceConfigured(asReadinessSource(item))) {
    return item.connectEnabled && item.stage !== 'planned' ? setupHref(item) : `/sources/${item.id}`;
  }
  return `/sources/${item.id}`;
}

function layerFilterMatches(item: CatalogueRowItem, filter: SourceLayerFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'supplemental') return groupFor(item) === 'supplemental';
  return sourceEvidenceLayerIds(asReadinessSource(item)).includes(filter);
}

function firstConnectableProviderId(items: CatalogueRowItem[], layer: SourceLayerFilter): string | null {
  if (layer === 'all') return null;
  return items.find((item) => (
    item.stage !== 'planned'
    && item.connectEnabled !== false
    && layerFilterMatches(item, layer)
  ))?.id ?? null;
}

function searchMatches(item: CatalogueRowItem, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = [
    item.name,
    item.description,
    item.category,
    item.account ?? '',
    ...layerNamesFor(item),
    ...evidenceStatesForSource(asReadinessSource(item)).map((capability) => `${capability.id} ${capability.description ?? ''}`),
  ].join(' ').toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function statusMatches(item: CatalogueRowItem, filter: SourceStatusFilter): boolean {
  return filter === 'all' || sourceStatus(asReadinessSource(item)) === filter;
}

function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return <span className={styles.statusPill} data-tone={tone}>{label}</span>;
}

function ProviderCard({ item, selected, onSelect }: { item: CatalogueRowItem; selected: boolean; onSelect: () => void }) {
  const maturity = maturityFor(item);
  const connection = connectionStateFor(item);
  const configured = isSourceConfigured(asReadinessSource(item));
  const layers = layerNamesFor(item);
  const evidence = evidenceStatesForSource(asReadinessSource(item));
  const supportedEvidence = evidence.filter((capability) => capability.support !== 'unsupported');

  return (
    <article className={styles.providerCard} data-selected={selected || undefined} data-state={connection.label.toLowerCase().replaceAll(' ', '-')}>
      <div className={styles.providerCardHeader}>
        <button
          type="button"
          className={styles.cardSelect}
          aria-pressed={selected}
          aria-label={`Inspect ${item.name} source`}
          onClick={onSelect}
        >
          <ProviderLogo provider={item.id} name={item.name} />
          <span className={styles.providerIdentity}>
            <strong>{item.name}</strong>
            <span>{layers.join(' · ') || item.category.replaceAll('_', ' ')}</span>
          </span>
          <ArrowRight size={14} aria-hidden="true" />
        </button>
        <div className={styles.cardPills} aria-label={`${item.name} maturity and connection state`}>
          <StatusPill label={maturity.label} tone={maturity.tone} />
          <StatusPill label={connection.label} tone={connection.tone} />
        </div>
      </div>

      <p className={styles.providerDescription}>{item.description}</p>
      <p className={styles.taskReason} data-task-group={taskGroupFor(item)}><strong>{TASK_GROUPS.find((group) => group.id === taskGroupFor(item))?.title}.</strong> {taskReason(item)}</p>

      <div className={styles.evidenceTags} aria-label={`${item.name} evidence capabilities`}>
        {supportedEvidence.length ? supportedEvidence.slice(0, 4).map((capability) => (
          <span key={capability.id} data-availability={capability.availability}>{humaniseEvidence(capability.id)}</span>
        )) : <span data-availability="unavailable">Evidence unavailable</span>}
        {supportedEvidence.length > 4 ? <span className={styles.moreTag}>+{supportedEvidence.length - 4}</span> : null}
      </div>

      {configured ? (
        <dl className={styles.providerFacts}>
          <div><dt>Account</dt><dd>{item.account ?? 'Not recorded'}</dd></div>
          <div><dt>Last data</dt><dd>{lastDataLabel(item)}</dd></div>
          <div><dt>Freshness</dt><dd>{freshnessLabel(item)}</dd></div>
          <div><dt>Records</dt><dd>{recordLabel(item)}</dd></div>
        </dl>
      ) : item.stage === 'planned' ? (
        <p className={styles.truthNote}>Catalogue-only slot. No connection, sync time, record count, or coverage is asserted.</p>
      ) : (
        <p className={styles.connectionNote}>{item.connectEnabled ? 'Available to connect for this workspace.' : 'Details are available, but a connection action is not implemented.'}</p>
      )}

      <footer className={styles.providerCardFooter}>
        <span className={styles.maturityNote}>{item.stage === 'planned' ? 'Intended evidence · not built' : item.runtimeVerificationPending ? 'Runtime verification pending' : 'Provider contract recorded'}</span>
        {item.stage === 'planned'
          ? null
          : <Link href={actionHref(item)} className={styles.cardAction}>{actionLabel(item)} <ArrowRight size={12} aria-hidden="true" /></Link>}
      </footer>
    </article>
  );
}

function layerAction(layer: LayerReadiness): { href: string; label: string } | null {
  const configured = layer.configuredProviders[0];
  if (configured && (!layer.ready || layer.needsAttention)) return { href: `/sources/${configured.id}`, label: 'Manage source' };
  if (layer.readyProviders.length) {
    const provider = layer.readyProviders[0];
    return { href: `/sources/${provider.id}`, label: layer.readyProviders.length > 1 ? 'Review sources' : 'Manage source' };
  }
  const provider = layer.availableProviders.find((candidate) => candidate.connectEnabled !== false);
  if (provider) return { href: setupHref(provider as CatalogueRowItem), label: 'Connect source' };
  return null;
}

function ReadinessStack({ items }: { items: CatalogueRowItem[] }) {
  const readiness = evaluateSourceReadiness(items);
  return (
    <section className={styles.readinessPanel} aria-labelledby="minimum-evidence-stack-title" data-state-id="minimum-evidence-stack">
      <div className={styles.readinessHeader}>
        <div>
          <h2 id="minimum-evidence-stack-title">Minimum evidence stack</h2>
          <p>One configured, usable source in each required layer gives Unauth the evidence boundary it needs to assemble a complete case.</p>
        </div>
        <div className={styles.readinessSummary} role="status" aria-live="polite">
          <strong>{readiness.readyCount} of {REQUIRED_EVIDENCE_LAYERS.length}</strong>
          <span>required evidence layers ready</span>
          {readiness.layers.some((layer) => layer.needsAttention) ? <small><CircleAlert size={12} aria-hidden="true" /> Configuration is ready where shown; some sources need attention.</small> : null}
        </div>
      </div>

      <div
        className={styles.readinessMeter}
        role="progressbar"
        aria-label="Required evidence layers ready"
        aria-valuemin={0}
        aria-valuemax={REQUIRED_EVIDENCE_LAYERS.length}
        aria-valuenow={readiness.readyCount}
        aria-valuetext={`${readiness.readyCount} of ${REQUIRED_EVIDENCE_LAYERS.length} required evidence layers ready`}
      >
        {readiness.layers.map((layer) => <span key={layer.id} data-state={layer.state} />)}
      </div>

      <div className={styles.readinessGrid}>
        {readiness.layers.map((layer) => {
          const action = layerAction(layer);
          const readinessLabel = layer.ready
            ? 'Ready'
            : layer.state === 'missing'
              ? 'Required · choose one'
              : layer.state === 'unavailable'
                ? 'Unavailable'
                : 'Not ready';
          const stateLabel = layer.needsAttention
            ? `${readinessLabel} · health needs attention`
            : readinessLabel;
          return (
            <article className={styles.layerCard} data-state={layer.state} key={layer.id}>
              <div className={styles.layerTopline}>
                <span className={styles.layerStep} data-state={layer.state}>{layer.sequence}</span>
                <span className={styles.layerState}>{stateLabel}</span>
              </div>
              <h3>{layer.name}</h3>
              <p>{layer.explanation}</p>
              {layer.readyProviders.length ? (
                <div className={styles.layerProviders}>
                  <span>
                    {layer.needsAttention
                      ? `Configured provider${layer.readyProviders.length === 1 ? '' : 's'} · needs attention`
                      : `Connected provider${layer.readyProviders.length === 1 ? '' : 's'}`}
                  </span>
                  <strong>{layer.readyProviders.map((provider) => provider.name).join(', ')}</strong>
                </div>
              ) : layer.configuredProviders.length ? (
                <div className={styles.layerProviders} data-state="attention">
                  <span>Configured, but not usable</span>
                  <strong>{layer.configuredProviders.map((provider) => provider.name).join(', ')}</strong>
                </div>
              ) : layer.state === 'missing' ? (
                <div className={styles.layerRequirement}>Connect one available provider to continue.</div>
              ) : (
                <div className={styles.layerRequirement}>No connectable provider is currently available for this layer.</div>
              )}
              {action ? <Link href={action.href} className={styles.layerAction}>{action.label} <ArrowRight size={12} aria-hidden="true" /></Link> : null}
            </article>
          );
        })}
      </div>

      <footer className={styles.readinessFooter}>
        <span>Counted from enabled evidence capabilities, not catalogue category. Configuration readiness and operational health stay separate.</span>
        <span>Europe/London</span>
      </footer>
    </section>
  );
}

function EvidenceState({ availability }: { availability: string }) {
  const label = availability === 'enabled'
    ? 'Enabled'
    : availability === 'not_connected'
      ? 'Not connected'
      : availability === 'permission_missing'
        ? 'Permission missing'
        : availability === 'degraded' || availability === 'merchant_disabled'
          ? 'Needs attention'
          : availability === 'unsupported'
            ? 'Planned'
            : 'Unavailable';
  return <span className={styles.inspectorState} data-state={availability}>{label}</span>;
}

function Inspector({ item, onClose }: { item: CatalogueRowItem; onClose: () => void }) {
  const configured = isSourceConfigured(asReadinessSource(item));
  const connection = connectionStateFor(item);
  const maturity = maturityFor(item);
  const evidence = evidenceStatesForSource(asReadinessSource(item));
  const layerNames = layerNamesFor(item);
  const history = [
    item.lastVerifiedAt ? { label: 'Connection verified', value: item.lastVerifiedAt } : null,
    item.lastSyncAttemptAt ? { label: 'Sync attempted', value: item.lastSyncAttemptAt } : null,
    item.lastSuccessfulSyncAt ? { label: 'Sync completed', value: item.lastSuccessfulSyncAt } : null,
    item.lastDataReceivedAt ? { label: 'Data received', value: item.lastDataReceivedAt } : null,
  ].filter((entry): entry is { label: string; value: string } => Boolean(entry));

  return (
    <aside className={styles.inspector} aria-label={`${item.name} source inspector`} aria-live="polite">
      <header className={styles.inspectorHeader}>
        <div className={styles.inspectorIdentity}>
          <ProviderLogo provider={item.id} name={item.name} />
          <div><strong>{item.name}</strong><span>{layerNames.join(' · ')}</span></div>
        </div>
        <button type="button" className={styles.closeInspector} onClick={onClose} aria-label="Close source inspector"><X size={15} aria-hidden="true" /></button>
      </header>

      <div className={styles.inspectorPills}>
        <StatusPill label={maturity.label} tone={maturity.tone} />
        <StatusPill label={connection.label} tone={connection.tone} />
      </div>

      <section className={styles.inspectorSection} aria-labelledby="inspector-evidence-title">
        <h3 id="inspector-evidence-title">Evidence capability mapping</h3>
        {evidence.length ? (
          <ul className={styles.mappingList}>
            {evidence.map((capability) => (
              <li key={capability.id}>
                <span><strong>{humaniseEvidence(capability.id)}</strong><small>{capability.description ?? capability.availabilityReason ?? 'Provider evidence capability'}</small></span>
                <EvidenceState availability={capability.availability} />
              </li>
            ))}
          </ul>
        ) : <p className={styles.unavailable}>No evidence capability mapping is available for this provider.</p>}
      </section>

      <section className={styles.inspectorSection} aria-labelledby="inspector-data-title">
        <h3 id="inspector-data-title">Connection and data</h3>
        {configured ? (
          <dl className={styles.inspectorFacts}>
            <div><dt>Account</dt><dd>{item.account ?? 'Not recorded'}</dd></div>
            <div><dt>Connection state</dt><dd>{connection.label}</dd></div>
            <div><dt>Last data received</dt><dd>{lastDataLabel(item)}</dd></div>
            <div><dt>Freshness</dt><dd>{freshnessLabel(item)}</dd></div>
            <div><dt>Known records</dt><dd>{recordLabel(item)}</dd></div>
          </dl>
        ) : item.stage === 'planned' ? (
          <p className={styles.unavailable}>Planned providers have no merchant connection, sync history, freshness, or record count.</p>
        ) : <p className={styles.unavailable}>No merchant connection is configured. No record count or freshness is asserted.</p>}
      </section>

      <section className={styles.inspectorSection} aria-labelledby="inspector-history-title">
        <h3 id="inspector-history-title">Connection history</h3>
        {history.length ? (
          <ol className={styles.historyList}>
            {history.map((entry) => <li key={`${entry.label}-${entry.value}`}><Clock3 size={12} aria-hidden="true" /><span>{entry.label}</span><time>{formatDateTime(entry.value)}</time></li>)}
          </ol>
        ) : <p className={styles.unavailable}>No connection history has been recorded.</p>}
      </section>

      {item.lastError ? <section className={styles.issueSection}><h3><CircleAlert size={13} aria-hidden="true" /> Connection issue</h3><p>{item.lastError}</p></section> : null}

      <footer className={styles.inspectorFooter}>
        <Link href={`/sources/${item.id}`} className={styles.inspectorDetails}>View source details <ArrowRight size={12} aria-hidden="true" /></Link>
        {item.stage === 'planned' ? <span className={styles.maturityNote}>Connection not available</span> : <Link href={actionHref(item)} className={styles.inspectorAction}>{actionLabel(item)} <ArrowRight size={12} aria-hidden="true" /></Link>}
      </footer>
    </aside>
  );
}

function ViewTabs({ view }: { view: SourcesView }) {
  return (
    <nav className={styles.viewTabs} aria-label="Source views">
      <Link href="/sources/connected" aria-current={view === 'connected' ? 'page' : undefined}>All sources</Link>
      <Link href="/sources/browse" aria-current={view === 'browse' ? 'page' : undefined}>Browse catalogue</Link>
      <Link href="/sources/imports">Imports</Link>
    </nav>
  );
}

function FilterBar({
  query,
  onQueryChange,
  layer,
  onLayerChange,
  status,
  onStatusChange,
  counts,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  layer: SourceLayerFilter;
  onLayerChange: (value: SourceLayerFilter) => void;
  status: SourceStatusFilter;
  onStatusChange: (value: SourceStatusFilter) => void;
  counts: Record<SourceStatusFilter, number>;
}) {
  const statusOptions: Array<{ value: SourceStatusFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'connected', label: 'Connected' },
    { value: 'not_connected', label: 'Not connected' },
    { value: 'attention', label: 'Needs attention' },
    { value: 'planned', label: 'Not available yet' },
  ];
  return (
    <section className={styles.filterBar} aria-label="Filter source catalogue">
      <label className={styles.searchField}>
        <Search size={14} aria-hidden="true" />
        <span className="sr-only">Search providers</span>
        <Input type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search providers" aria-label="Search providers" />
      </label>
      <label className={styles.selectField}>
        <span>Evidence layer</span>
        <Select value={layer} onChange={(event) => onLayerChange(event.target.value as SourceLayerFilter)} aria-label="Filter by evidence layer">
          <option value="all">All layers</option>
          {CATALOGUE_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.title}</option>)}
        </Select>
      </label>
      <div className={styles.statusFilters} role="group" aria-label="Filter by connection state">
        {statusOptions.map((option) => (
          <button key={option.value} type="button" aria-pressed={status === option.value} onClick={() => onStatusChange(option.value)}>
            {option.label}<span>{counts[option.value]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function SourcesOperations({
  items,
  view,
  initialQuery = '',
  initialStatus = 'all',
  initialLayer = 'all',
  showPlanned = true,
}: {
  items: CatalogueRowItem[];
  view: SourcesView;
  initialQuery?: string;
  initialStatus?: SourceStatusFilter;
  initialLayer?: SourceLayerFilter;
  showPlanned?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<SourceStatusFilter>(initialStatus);
  const [layer, setLayer] = useState<SourceLayerFilter>(initialLayer);
  const [selectedId, setSelectedId] = useState<string | null>(() => (
    view === 'browse' ? firstConnectableProviderId(items, initialLayer) : null
  ));

  const catalogueItems = useMemo(
    () => showPlanned ? items : items.filter((item) => item.stage !== 'planned'),
    [items, showPlanned],
  );

  const counts = useMemo(() => {
    const result: Record<SourceStatusFilter, number> = { all: catalogueItems.length, connected: 0, not_connected: 0, attention: 0, planned: 0 };
    catalogueItems.forEach((item) => { result[sourceStatus(asReadinessSource(item))] += 1; });
    return result;
  }, [catalogueItems]);

  const visible = useMemo(() => catalogueItems.filter((item) => (
    statusMatches(item, status) && layerFilterMatches(item, layer) && searchMatches(item, query)
  )), [catalogueItems, layer, query, status]);

  useEffect(() => {
    setSelectedId((current) => current && visible.some((item) => item.id === current) ? current : null);
  }, [visible]);

  const selected = visible.find((item) => item.id === selectedId) ?? null;
  const groupedVisible = TASK_GROUPS.map((group) => ({
    group,
    items: visible.filter((item) => taskGroupFor(item) === group.id),
  })).filter((group) => group.items.length > 0);

  return (
    <div className={styles.page}>
      <section className={styles.catalogueSection} aria-labelledby="complete-source-catalogue-title">
        <header className={styles.catalogueHeader}>
          <div>
            <h2 id="complete-source-catalogue-title">{view === 'connected' ? 'What needs attention now' : 'Find a source to connect'}</h2>
            <p>Sources are grouped by the next operator task. Capability, workspace configuration, usability, returned data and freshness remain separate in every row and detail.</p>
          </div>
          <ViewTabs view={view} />
        </header>

        <FilterBar
          query={query}
          onQueryChange={setQuery}
          layer={layer}
          onLayerChange={setLayer}
          status={status}
          onStatusChange={setStatus}
          counts={counts}
        />

        <div className={styles.catalogueSummary} role="status" aria-live="polite">
          <strong>{visible.length} provider{visible.length === 1 ? '' : 's'}</strong>
          <span>{catalogueItems.length} in the canonical registry</span>
          {query || layer !== 'all' || status !== 'all' ? <button type="button" onClick={() => { setQuery(''); setLayer('all'); setStatus('all'); }}>Clear filters</button> : null}
        </div>

        {groupedVisible.length ? (
          <div className={styles.catalogueWorkbench}>
            <div className={styles.catalogueGroups}>
              {groupedVisible.map(({ group, items: groupItems }) => (
                <section className={styles.catalogueGroup} key={group.id} aria-labelledby={`catalogue-group-${group.id}`}>
                  <header>
                    <div><h3 id={`catalogue-group-${group.id}`}>{group.title}</h3><p>{group.description}</p></div>
                    <span>{groupItems.length}</span>
                  </header>
                  <div className={styles.providerGrid}>
                    {groupItems.map((item) => <ProviderCard key={item.id} item={item} selected={selected?.id === item.id} onSelect={() => setSelectedId(item.id)} />)}
                  </div>
                </section>
              ))}
            </div>
            {selected ? <Inspector item={selected} onClose={() => setSelectedId(null)} /> : null}
          </div>
        ) : (
          <div className={styles.emptyState} data-state-id="source-catalogue-no-results">
            <Search size={18} aria-hidden="true" />
            <h3>No sources match these filters</h3>
            <p>Clear the search or choose a different evidence layer or connection state.</p>
            <button type="button" onClick={() => { setQuery(''); setLayer('all'); setStatus('all'); }}>Clear filters</button>
          </div>
        )}
      </section>

      <ReadinessStack items={items} />
    </div>
  );
}
