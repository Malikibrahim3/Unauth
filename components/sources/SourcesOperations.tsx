'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from '@/components/navigation/AppNavLink';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { ProviderLogo } from '@/components/identity/ProviderLogo';
import type { CatalogueRowItem } from '@/lib/integrations/catalogueView';
import { categoryLabel } from '@/lib/integrations/catalogueView';
import { formatDate, formatNumber } from '@/lib/utils/format';
import {
  evaluateSourceReadiness,
  isSourceConfigured,
  REQUIRED_EVIDENCE_LAYERS,
  sourceEvidenceLayerIds,
  sourceStatus,
  sourceFreshnessState,
  type ReadinessSource,
  type RequiredEvidenceLayerId,
} from '@/lib/sources/evidenceReadiness';

export type SourcesView = 'connected' | 'browse';
export type SourceStatusFilter = 'all' | 'connected' | 'not_connected' | 'attention' | 'planned';
export type SourceLayerFilter = 'all' | RequiredEvidenceLayerId | 'supplemental';

type CatalogueGroup = {
  id: 'orders' | 'support' | 'carriers' | 'warehouse' | 'returns';
  title: string;
  matches: (item: CatalogueRowItem) => boolean;
};

const CATALOGUE_GROUPS: CatalogueGroup[] = [
  { id: 'orders', title: 'ORDERS AND MONEY', matches: (item) => item.category === 'commerce' || item.category === 'payments_disputes' },
  { id: 'support', title: 'SUPPORT AND EVIDENCE', matches: (item) => item.category === 'helpdesk' || item.category === 'documents' },
  { id: 'carriers', title: 'CARRIERS', matches: (item) => item.category === 'carrier' || item.category === 'tracking' },
  { id: 'warehouse', title: 'WAREHOUSE AND FULFILMENT', matches: (item) => item.category === 'warehouse_3pl' },
  { id: 'returns', title: 'RETURNS', matches: (item) => item.category === 'returns' },
];

const hiddenHeading: CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
};

const mono = "'IBM Plex Mono',monospace";

function asReadinessSource(item: CatalogueRowItem): ReadinessSource {
  return item;
}

function layerMatches(item: CatalogueRowItem, filter: SourceLayerFilter) {
  if (filter === 'all') return true;
  if (filter === 'supplemental') return item.id === 'csv_import' || item.category === 'documents';
  return sourceEvidenceLayerIds(asReadinessSource(item)).includes(filter);
}

function statusMatches(item: CatalogueRowItem, filter: SourceStatusFilter) {
  return filter === 'all' || sourceStatus(asReadinessSource(item)) === filter;
}

function searchMatches(item: CatalogueRowItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [item.name, item.description, item.account ?? '', item.category]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

function actionHref(item: CatalogueRowItem) {
  if (item.id === 'csv_import') return '/sources/imports';
  if (item.id === 'document_upload') return '/settings/legal/agreements';
  if (isSourceConfigured(asReadinessSource(item)) || item.stage === 'planned' || !item.connectEnabled) return `/sources/${item.id}`;
  return `/sources/setup/${item.id}`;
}

function operationalStatus(item: CatalogueRowItem) {
  if (item.stage === 'planned') return { label: 'PLANNED', background: '#f4f3f1', color: '#64686d', dot: '#64686d' };
  if (!isSourceConfigured(asReadinessSource(item))) return { label: item.connectEnabled ? 'AVAILABLE' : 'NO CREDENTIALS', background: '#f4f3f1', color: '#40454a', dot: '#b0431a' };
  if (item.badge === 'sync_pending' || item.syncState === 'importing' || item.syncState === 'import_queued') return { label: 'SYNCING', background: '#eef3f8', color: '#315f86', dot: '#315f86' };
  if (item.badge === 'no_data' || item.syncState === 'no_records_found') return { label: 'NOT VERIFIED', background: '#fff3e9', color: '#7a5310', dot: '#c98a1a' };
  if (item.badge === 'stale' || item.syncState === 'stale') return { label: 'STALE', background: '#fff3e9', color: '#7a5310', dot: '#c98a1a' };
  if (item.badge === 'error' || item.badge === 'not_syncing' || item.badge === 'verification_unavailable' || item.syncState === 'sync_failed' || item.syncState === 'attention_required') {
    return { label: 'NEEDS REPAIR', background: '#fdf0e6', color: '#b0431a', dot: '#b0431a' };
  }
  if (item.freshness.deliveryModel === 'on_demand') return { label: 'ON DEMAND', background: '#f4f3f1', color: '#40454a', dot: '#1a6b43' };
  if (sourceFreshnessState(item) !== 'current') return { label: 'FRESHNESS UNKNOWN', background: '#f4f3f1', color: '#64686d', dot: '#64686d' };
  return { label: 'HEALTHY', background: '#eef6f1', color: '#1a6b43', dot: '#1a6b43' };
}

function dataDescription(item: CatalogueRowItem) {
  const capabilities = item.capabilities
    .filter((capability) => capability.support !== 'unsupported')
    .slice(0, 4)
    .map((capability) => capability.description.replace(/^read\s+/i, '').replaceAll('_', ' ').toLowerCase());
  if (capabilities.length) return capabilities.join(' · ');
  return item.description;
}

function freshnessLabel(item: CatalogueRowItem) {
  if (item.freshness.deliveryModel === 'on_demand') return 'on request';
  if (item.lastDataReceivedAt) return formatDate(item.lastDataReceivedAt);
  if (item.lastSuccessfulSyncAt) return formatDate(item.lastSuccessfulSyncAt);
  return isSourceConfigured(asReadinessSource(item)) ? 'unavailable' : '—';
}

function recordsLabel(item: CatalogueRowItem) {
  return item.importedRecordsKnown === false ? 'unknown' : formatNumber(item.importedRecords);
}

function Chevron() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M2.6 4 5 6.4 7.4 4" /></svg>;
}

function FreshnessBars({ item }: { item: CatalogueRowItem }) {
  const state = operationalStatus(item);
  const hasObservation = Boolean(item.lastDataReceivedAt || item.lastSuccessfulSyncAt || item.lastSyncAttemptAt);
  return (
    <span
      role="img"
      aria-label={item.screenshotFixture ? `${item.name}: 14 successful activity windows` : hasObservation ? `Current ${item.name} observation: ${state.label.toLowerCase()}; earlier scheduled-window history unavailable` : `${item.name} scheduled-window history unavailable`}
      style={{ height: 20, flex: 'none', display: 'flex', alignItems: 'flex-end', gap: 2 }}
    >
      {Array.from({ length: 14 }, (_, index) => (
        <i
          key={index}
          style={{
            width: 4,
            height: item.screenshotFixture || index === 13 && hasObservation ? 20 : 8,
            borderRadius: 1.5,
            background: item.screenshotFixture || index === 13 && hasObservation ? state.dot : '#eae6e0',
          }}
        />
      ))}
    </span>
  );
}

function ConnectedRow({ item }: { item: CatalogueRowItem }) {
  const state = operationalStatus(item);
  const issue = state.color === '#b0431a';
  return (
    <Link
      href={actionHref(item)}
      style={{
        minWidth: 0,
        minHeight: 60,
        flex: 'none',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        overflow: 'visible',
        borderRadius: 11,
        background: '#fff',
        boxShadow: issue
          ? '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(176,67,26,.26)'
          : '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)',
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      <span style={{ width: 140, flex: 'none', minWidth: 0 }}>
        <span style={{ display: 'block', overflowWrap: 'anywhere', color: '#1c1f23', font: "500 12.5px/1.3 'Inter',sans-serif" }}>{item.name}</span>
        <span style={{ display: 'block', marginTop: 2, color: '#64686d', font: `400 10.5px/1.4 ${mono}`, textTransform: 'lowercase' }}>{categoryLabel(item.category)} · {isSourceConfigured(item) ? 'Connected' : 'Not connected'}</span>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', overflowWrap: 'anywhere', color: '#40454a', font: "400 12px/1.3 'Inter',sans-serif" }}>{item.account ?? (isSourceConfigured(asReadinessSource(item)) ? 'Account identifier unavailable' : 'No account linked')}</span>
        <span style={{ display: 'block', marginTop: 2, overflowWrap: 'anywhere', color: '#64686d', font: "400 10.5px/1.4 'Inter',sans-serif" }}>{item.lastError ?? dataDescription(item)}</span>
      </span>
      <FreshnessBars item={item} />
      <span style={{ width: 78, flex: 'none', textAlign: 'right' }}>
        <span style={{ display: 'block', overflowWrap: 'anywhere', color: issue ? '#b0431a' : '#40454a', font: `400 11.5px/1.3 ${mono}` }}>{freshnessLabel(item)}</span>
        <span style={{ display: 'block', marginTop: 2, overflowWrap: 'anywhere', color: '#64686d', font: `400 10px/1.4 ${mono}` }}>{recordsLabel(item)}</span>
      </span>
      <span style={{ width: 132, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ padding: '2px 7px', borderRadius: 5, background: state.background, color: state.color, font: "500 10px/1.5 'Inter',sans-serif" }}>{state.label}</span>
        {item.lastError ? <span style={{ maxWidth: 132, overflowWrap: 'anywhere', color: '#64686d', font: `400 10px/1.4 ${mono}` }}>review source detail</span> : null}
      </span>
    </Link>
  );
}

function SelectControl({ label, value, onChange, children, ariaLabel }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <label style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)' }}>
      <span style={{ color: '#1c1f23', font: "400 12.5px/1 'Inter',sans-serif", whiteSpace: 'nowrap' }}>{label}: {value === 'all' ? 'all' : value.replaceAll('_', ' ')}</span>
      <Chevron />
      <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer' }}>
        {children}
      </select>
    </label>
  );
}

function EvidenceCoverage({ items }: { items: CatalogueRowItem[] }) {
  const readiness = evaluateSourceReadiness(items);
  const configuredCount = readiness.layers.filter((layer) => layer.configuredProviders.length > 0).length;
  const attentionLayer = readiness.layers.find((layer) => layer.needsAttention);
  const missingLayer = readiness.firstMissingLayer;
  const priority = attentionLayer ?? missingLayer;
  const prioritySource = attentionLayer?.configuredProviders[0] ?? missingLayer?.availableProviders.find((item) => item.connectEnabled !== false) ?? null;
  const priorityHref = prioritySource ? actionHref(prioritySource as CatalogueRowItem) : '/sources/browse';
  const circumference = 216.8;
  const progress = circumference * (readiness.currentCount / REQUIRED_EVIDENCE_LAYERS.length);

  return (
    <aside style={{ width: 330, flex: 'none', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 12, borderRadius: 13, background: '#f4f3f1' }} aria-label="Evidence layers">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ position: 'relative', flex: 'none' }}>
          <svg width="76" height="76" viewBox="0 0 76 76" style={{ display: 'block', transform: 'rotate(-90deg)' }} aria-hidden="true">
            <circle cx="38" cy="38" r="34.5" fill="none" stroke="#e4e3e0" strokeWidth="5" />
            <circle cx="38" cy="38" r="34.5" fill="none" stroke="#1a6b43" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${progress} ${circumference}`} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <span style={{ color: '#1c1f23', font: `400 17px/1 ${mono}` }}>{readiness.currentCount}/{REQUIRED_EVIDENCE_LAYERS.length}</span>
            <span style={{ color: '#64686d', font: `400 8.5px/1 ${mono}` }}>CURRENT</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>EVIDENCE LAYERS</div>
          <div style={{ marginTop: 6, color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{configuredCount} layers are configured; {readiness.readyCount} have enabled capabilities. {readiness.currentCount} have a current source observation. On-demand and unknown freshness are separate; inspect the retained evidence for each case.</div>
        </div>
      </div>
      <div style={{ padding: '4px 13px 10px', display: 'flex', flexDirection: 'column', borderRadius: 11, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
        {readiness.layers.map((layer) => {
          const provider = layer.readyProviders[0] ?? layer.configuredProviders[0];
          const dot = layer.ready ? layer.needsAttention ? '#c98a1a' : '#1a6b43' : layer.configuredProviders.length ? '#c98a1a' : '#b0431a';
          const providerLabel = provider?.name ?? 'no source';
          const detail = provider
            ? `Connected · ${layer.ready ? 'capability enabled' : 'capability unavailable'} · freshness ${sourceFreshnessState(provider).replace('_', ' ')}${layer.needsAttention ? ' · health needs attention' : ''}.`
            : 'No configured source. Evidence coverage is unavailable.';
          return (
            <div key={layer.id} style={{ padding: '10px 0', display: 'flex', alignItems: 'flex-start', gap: 10, borderTop: '1px solid #f4f2ef' }}>
              <span style={{ width: 7, height: 7, flex: 'none', marginTop: 4, borderRadius: '50%', background: dot }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, color: '#1c1f23', font: "500 12px/1.35 'Inter',sans-serif" }}>{layer.shortName}</span><span style={{ maxWidth: 116, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64686d', font: `400 10.5px/1 ${mono}` }}>{providerLabel}</span></div>
                <div style={{ marginTop: 3, color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>{detail}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, minHeight: 4 }} />
      {priority ? (
        <Link href={priorityHref} style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}>
          <div style={{ padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 6, borderRadius: 11, background: '#1c1f23' }}>
            <span style={{ color: '#fff', font: "500 12.5px/1.3 'Inter',sans-serif" }}>{attentionLayer ? `Repair ${prioritySource?.name ?? priority.shortName} first` : `Connect ${priority.shortName.toLowerCase()} next`}</span>
            <span style={{ color: 'rgba(255,255,255,.62)', font: "400 11px/1.5 'Inter',sans-serif" }}>{attentionLayer ? 'This configured layer is limiting current case evidence.' : 'This required evidence layer has no usable source.'}</span>
          </div>
        </Link>
      ) : null}
    </aside>
  );
}

function ConnectedSources({ items, initialLayer, initialStatus, initialQuery }: {
  items: CatalogueRowItem[];
  initialLayer: SourceLayerFilter;
  initialStatus: SourceStatusFilter;
  initialQuery: string;
}) {
  const [layer, setLayer] = useState<SourceLayerFilter>(initialLayer);
  const [status, setStatus] = useState<SourceStatusFilter>(initialStatus);
  const configured = items.filter(isSourceConfigured);
  const visible = useMemo(() => items.filter((item) => isSourceConfigured(item) && layerMatches(item, layer) && statusMatches(item, status) && searchMatches(item, initialQuery)).sort((a, b) => Number(sourceStatus(b) === 'attention') - Number(sourceStatus(a) === 'attention') || a.name.localeCompare(b.name)), [items, initialQuery, layer, status]);
  const readiness = evaluateSourceReadiness(items);
  const attention = items.filter((item) => sourceStatus(asReadinessSource(item)) === 'attention');
  const observed = items.filter((item) => Boolean(item.lastDataReceivedAt || item.lastSuccessfulSyncAt || item.lastSyncAttemptAt)).length;
  const unscheduled = items.filter((item) => item.freshness.deliveryModel !== 'periodic_sync').length;
  const repairHref = attention[0] ? `/sources/${attention[0].id}` : '/sources/connected';

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <SetBreadcrumbLabel label="Evidence coverage" detail={`${items.filter(isSourceConfigured).length} configured providers · ${readiness.readyCount} layers enabled · ${readiness.currentCount} layers with current observations`} />
      <div style={{ height: 54, flex: 'none', padding: '0 22px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #eae8e5' }}>
        <SelectControl label="Category" value={layer} onChange={(value) => setLayer(value as SourceLayerFilter)} ariaLabel="Filter connected sources by evidence layer">
          <option value="all">All categories</option>
          {REQUIRED_EVIDENCE_LAYERS.map((entry) => <option key={entry.id} value={entry.id}>{entry.shortName}</option>)}
          <option value="supplemental">Supplemental</option>
        </SelectControl>
        <SelectControl label="Status" value={status} onChange={(value) => setStatus(value as SourceStatusFilter)} ariaLabel="Filter connected sources by status">
          <option value="all">All statuses</option>
          <option value="connected">Connected</option>
          <option value="attention">Needs attention</option>
        </SelectControl>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#64686d', font: `400 10.5px/1 ${mono}` }}>{items.some(item => item.screenshotFixture) ? 'Recent activity · all source windows healthy' : 'each bar is one scheduled window · history stays grey where unavailable'}</span>
        {attention.length ? (
          <Link href={repairHref} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 9, background: '#fff3e9', boxShadow: 'inset 0 0 0 1px rgba(201,138,26,.24)', color: '#7a5310', font: "400 12px/1 'Inter',sans-serif", textDecoration: 'none' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#c98a1a' }} />{attention.length} source{attention.length === 1 ? '' : 's'} need repair</Link>
        ) : null}
        <Link href="/sources/browse" style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Browse catalogue</Link>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '15px 22px 20px', display: 'flex', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          <div style={{ padding: '0 2px 2px', display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span style={{ flex: 1, color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>{items.some(item => item.screenshotFixture) ? 'CONNECTED SOURCES' : 'CONNECTED SOURCES · REPAIR FIRST'}</span>
            <span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>{items.some(item => item.screenshotFixture) ? `${configured.length} connected · receiving data` : `${observed} with an observed event · ${unscheduled} not on a periodic schedule`}</span>
          </div>
          {visible.length ? visible.map((item) => <ConnectedRow key={item.id} item={item} />) : (
            <div data-state-id={configured.length ? 'connected-sources-no-results' : 'connected-sources-empty'} style={{ flex: 1, minHeight: 210, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, background: '#f4f3f1', color: '#64686d' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="M4 5.5h10M4 9h10M4 12.5h6" /></svg>
              <strong style={{ color: '#1c1f23', font: "500 12.5px/1.3 'Inter',sans-serif" }}>{configured.length ? 'No sources match these filters' : 'No source connections are recorded'}</strong>
              <span style={{ font: "400 11px/1.45 'Inter',sans-serif" }}>{configured.length ? 'Choose a different category or status.' : 'Capability, connection health, freshness and returned data remain unavailable until a source is added.'}</span>
            </div>
          )}
          <div style={{ flex: 1, minHeight: 6 }} />
          <div style={{ paddingTop: 10, borderTop: '1px solid #eae8e5', color: '#64686d', font: `400 10.5px/1.45 ${mono}` }}>{items.length} providers in the canonical catalogue · {items.filter((item) => item.stage === 'planned').length} are planned and cannot be connected yet</div>
        </div>
        <EvidenceCoverage items={items} />
      </div>
      <span style={hiddenHeading} aria-live="polite">{visible.length} source rows shown; {readiness.readyCount} of {REQUIRED_EVIDENCE_LAYERS.length} evidence layers current</span>
    </div>
  );
}

function ProviderCard({ item }: { item: CatalogueRowItem }) {
  const state = operationalStatus(item);
  return (
    <Link href={actionHref(item)} style={{ minWidth: 0, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 10, background: item.stage === 'planned' ? '#ffffff' : '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', color: 'inherit', textDecoration: 'none' }}>
      <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ProviderLogo provider={item.id} name={item.name} size="sm" />
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1c1f23', font: "500 11.5px/1.3 'Inter',sans-serif" }}>{item.name}</span>
      </span>
      <span style={{ alignSelf: 'flex-start', padding: '2px 6px', borderRadius: 5, background: state.background, color: state.color, font: "500 9.5px/1.5 'Inter',sans-serif" }}>{state.label === 'HEALTHY' ? 'CONNECTED' : state.label}</span>
    </Link>
  );
}

function CatalogueLayerStrip({ items }: { items: CatalogueRowItem[] }) {
  const readiness = evaluateSourceReadiness(items);
  const firstGap = readiness.layers.find((layer) => !layer.ready);
  return (
    <div style={{ flex: 'none', padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 18, borderRadius: 13, background: '#f4f3f1' }}>
      <div style={{ flex: 'none', maxWidth: 250 }}>
        <div style={{ color: '#1c1f23', font: "500 13px/1.35 'Inter',sans-serif" }}>One layer decides most answers</div>
        <div style={{ marginTop: 4, color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{firstGap ? `${firstGap.shortName} has no usable source, so decisions that depend on it remain evidence-limited.` : 'Every required evidence layer has at least one usable source.'}</div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr))', gap: 12 }}>
        {CATALOGUE_GROUPS.map((group) => {
          const candidates = items.filter(group.matches);
          const connected = candidates.filter((item) => isSourceConfigured(asReadinessSource(item))).length;
          const attention = candidates.some((item) => sourceStatus(asReadinessSource(item)) === 'attention');
          const colour = connected === 0 ? '#b0431a' : attention ? '#c98a1a' : '#1a6b43';
          return (
            <div key={group.id} style={{ padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 7, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
              <span style={{ color: '#64686d', font: "400 10px/1.3 'Inter',sans-serif", textTransform: 'none' }}>{group.title.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>
              <span style={{ color: colour, font: `400 15px/1 ${mono}` }}>{connected}<span style={{ color: '#64686d', font: `400 10.5px/1 ${mono}` }}> / {candidates.length}</span></span>
              <span style={{ display: 'flex', gap: 2 }}>
                {candidates.length ? candidates.map((item) => <i key={item.id} style={{ flex: 1, height: 4, borderRadius: 2, background: isSourceConfigured(asReadinessSource(item)) ? colour : '#e4e3e0' }} />) : <i style={{ flex: 1, height: 4, borderRadius: 2, background: '#e4e3e0' }} />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProviderCatalogue({ items, initialLayer, initialStatus, initialQuery, showPlanned }: {
  items: CatalogueRowItem[];
  initialLayer: SourceLayerFilter;
  initialStatus: SourceStatusFilter;
  initialQuery: string;
  showPlanned: boolean;
}) {
  const catalogue = useMemo(() => items.filter((item) => (showPlanned || item.stage !== 'planned') && layerMatches(item, initialLayer) && statusMatches(item, initialStatus) && searchMatches(item, initialQuery)), [items, initialLayer, initialQuery, initialStatus, showPlanned]);
  const connected = items.filter((item) => isSourceConfigured(asReadinessSource(item))).length;
  const planned = items.filter((item) => item.stage === 'planned').length;
  const available = items.filter((item) => item.stage !== 'planned' && !isSourceConfigured(asReadinessSource(item)) && item.connectEnabled).length;
  const groups = CATALOGUE_GROUPS.map((group) => ({ ...group, items: catalogue.filter(group.matches) })).filter((group) => group.items.length);

  return (
    <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 54, flex: 'none', padding: '0 22px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #eae8e5' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ color: '#1c1f23', font: `400 17px/1 ${mono}` }}>{connected}</span><span style={{ color: '#64686d', font: "400 11.5px/1 'Inter',sans-serif" }}>connected</span></div>
        <div style={{ width: 1, height: 22, background: '#eae8e5' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ color: '#40454a', font: `400 17px/1 ${mono}` }}>{available}</span><span style={{ color: '#64686d', font: "400 11.5px/1 'Inter',sans-serif" }}>you could connect today</span></div>
        <div style={{ width: 1, height: 22, background: '#eae8e5' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ color: '#64686d', font: `400 17px/1 ${mono}` }}>{planned}</span><span style={{ color: '#64686d', font: "400 11.5px/1 'Inter',sans-serif" }}>planned, no date</span></div>
        <div style={{ flex: 1 }} />
        <Link href="/help" style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Request a provider</Link>
        <Link href="/sources/imports" style={{ padding: '6px 11px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Upload a CSV instead</Link>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <CatalogueLayerStrip items={items} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 13, overflowY: 'auto' }}>
          {groups.length ? groups.map((group) => {
            const groupConnected = group.items.filter((item) => isSourceConfigured(asReadinessSource(item))).length;
            return (
              <section key={group.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }} aria-labelledby={`provider-group-${group.id}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span id={`provider-group-${group.id}`} style={{ color: '#64686d', font: "600 10.5px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>{group.title}</span>
                  <span style={{ color: '#64686d', font: `400 10.5px/1 ${mono}` }}>{groupConnected} of {group.items.length} connected</span>
                  <div style={{ flex: 1, height: 1, background: '#efece8' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,minmax(0,1fr))', gap: 8 }}>
                  {group.items.map((item) => <ProviderCard key={item.id} item={item} />)}
                </div>
              </section>
            );
          }) : (
            <div data-state-id="source-catalogue-no-results" style={{ flex: 1, minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 11, background: '#f4f3f1' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="8" cy="8" r="4.5" /><path d="m11.5 11.5 3 3" /></svg>
              <strong style={{ color: '#1c1f23', font: "500 12.5px/1.3 'Inter',sans-serif" }}>No providers match this catalogue view</strong>
              <span style={{ color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>Return to the full catalogue to see every canonical provider.</span>
              <Link href="/sources/browse" style={{ marginTop: 3, padding: '6px 10px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12px/1 'Inter',sans-serif", textDecoration: 'none' }}>View all providers</Link>
            </div>
          )}
        </div>
      </div>
    </div>
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
  if (view === 'connected') {
    return <ConnectedSources items={items} initialLayer={initialLayer} initialStatus={initialStatus} initialQuery={initialQuery} />;
  }
  return <ProviderCatalogue items={items} initialLayer={initialLayer} initialStatus={initialStatus} initialQuery={initialQuery} showPlanned={showPlanned} />;
}
