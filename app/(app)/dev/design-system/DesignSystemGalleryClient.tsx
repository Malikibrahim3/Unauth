'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Button,
  Badge,
  Card,
  DataTable,
  Drawer,
  EmptyState,
  FilterChip,
  IconButton,
  InsetGroup,
  JoinedSection,
  Input,
  MetricCard,
  MetricGroup,
  Modal,
  OperationalState,
  PageFrame,
  RegistrySurface,
  Recency,
  Select,
  SectionCard,
  SegmentedControl,
  StatusBadge,
  StatusWithReason,
  Surface,
  Tabs,
  Tooltip,
  LoadingSkeleton,
  Bone,
  Spinner,
  LivenessIndicator,
  SettingsNav,
  BuilderShell,
  BuilderValidationSummary,
  BuilderSequence,
  BuilderStep,
  EvidenceThread,
  FinancialEquation,
  FormField,
  SourceBeacon,
  Switch,
} from '@/components/ui';
import { useAsyncResource } from '@/lib/react/useFetchJson';
import { ArrowLeft, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import { ChartTooltip } from '@/components/charts/authenticated/core/ChartTooltip';
import {
  ChartFrame,
  ChartState,
  ChartLegend,
  type ChartStateKind,
} from '@/components/charts/authenticated/ChartFrame';
import chartStyles from '@/components/charts/authenticated/AuthenticatedCharts.module.css';
import { formatNumber } from '@/lib/utils/format';
import {
  MATRIX_CELL,
  MATRIX_GAP,
  MATRIX_RADIUS,
  RAIL_HEIGHT,
  RAIL_BLOCK_RADIUS,
  RAIL_BLOCK_GAP,
  TICK_W,
  TICK_H,
  TICK_GAP,
  TICK_RADIUS,
  SEGMENT_BAR_H,
  SEGMENT_GAP,
  SEGMENT_RADIUS,
  TAB_ICON_CHIP,
} from '@/components/charts/authenticated/core/geometry';

/*
 * Instrument Grade: the analytical palette is the accent plus a neutral
 * ramp. Current/primary data is accent; every comparison series is neutral.
 * The three semantic hues below are listed last because they enter a chart only
 * when the encoded value is itself success, warning, or critical — they are
 * never categorical series colours, and there is no numbered slot palette.
 */
const CHART_SLOTS = [
  { token: '--ua-chart-primary', label: 'Current / primary series' },
  { token: '--ua-chart-primary-soft', label: 'Related secondary series' },
  { token: '--ua-chart-neutral-900', label: 'Strong comparison' },
  { token: '--ua-chart-neutral-700', label: 'Secondary comparison' },
  { token: '--ua-chart-neutral-500', label: 'Tertiary series' },
  { token: '--ua-chart-neutral-300', label: 'Baseline / context only' },
  { token: '--ua-success', label: 'Encoded success only' },
  { token: '--ua-warning', label: 'Encoded warning only' },
  { token: '--ua-critical', label: 'Encoded critical only' },
] as const;

function GallerySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AuthenticatedPanel title={title} bodyClassName="p-4">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--ua-space-3)', alignItems: 'flex-start' }}>
        {children}
      </div>
    </AuthenticatedPanel>
  );
}

function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div style={{ width: 140 }}>
      <div
        style={{
          height: 56,
          borderRadius: 'var(--ua-radius-surface)',
          border: '1px solid var(--ua-border-default)',
          background: `var(${cssVar})`,
        }}
      />
      <p className="text-caption" style={{ marginTop: 'var(--ua-space-1)', color: 'var(--ua-text-secondary)' }}>
        {name}
      </p>
      <p className="text-caption" style={{ color: 'var(--ua-text-tertiary)', fontFamily: 'var(--ua-font-mono)' }}>
        {cssVar}
      </p>
    </div>
  );
}

const SURFACE_SWATCHES = [
  ['Canvas', '--ua-canvas'],
  ['Surface primary', '--ua-surface-primary'],
  ['Surface secondary', '--ua-surface-secondary'],
  ['Surface hover', '--ua-surface-hover'],
  ['Surface selected', '--ua-surface-selected'],
] as const;

/* §3.2 — one product accent. Every selection, focus, link, forward action, and
 * current data series comes from this scale; nothing else introduces a hue. */
const ACCENT_SWATCHES = [
  ['Accent 50', '--ua-accent-50'],
  ['Accent 100 · selected bg', '--ua-accent-100'],
  ['Accent 200 · selected border', '--ua-accent-200'],
  ['Accent 300', '--ua-accent-300'],
  ['Accent 400', '--ua-accent-400'],
  ['Accent 500 · primary', '--ua-accent-500'],
  ['Accent 600 · hover', '--ua-accent-600'],
  ['Accent 700 · pressed / link', '--ua-accent-700'],
  ['Accent 800 · accent text', '--ua-accent-800'],
] as const;

const ACTION_SWATCHES = [
  ['Action primary', '--ua-action-primary'],
  ['Action primary hover', '--ua-action-primary-hover'],
  ['Action commit', '--ua-action-commit'],
  ['Action commit hover', '--ua-action-commit-hover'],
] as const;

const SEMANTIC_SWATCHES = [
  ['Success', '--ua-success-bg'],
  ['Warning', '--ua-warning-bg'],
  ['Critical', '--ua-critical-bg'],
  ['Info', '--ua-info-bg'],
  ['Unknown / unavailable', '--ua-neutral-bg'],
] as const;

const TYPE_ROLES = [
  ['Page title', '--ua-text-page-title-size', '--ua-text-page-title-weight'],
  ['Section title', '--ua-text-section-title-size', '--ua-text-section-title-weight'],
  ['Detail identity', '--ua-text-detail-identity-size', '--ua-text-detail-identity-weight'],
  ['Card / chart title', '--ua-text-chart-title-size', '--ua-text-chart-title-weight'],
  ['Body', '--ua-text-body-size', '--ua-text-body-weight'],
  ['Dense body', '--ua-text-dense-size', '--ua-text-dense-weight'],
  ['Label', '--ua-text-label-size', '--ua-text-label-weight'],
  ['Caption', '--ua-text-caption-size', '--ua-text-caption-weight'],
  ['Metadata', '--ua-text-metadata-size', '--ua-text-metadata-weight'],
  ['KPI value', '--ua-text-kpi-size', '--ua-text-kpi-weight'],
  ['Hero financial value', '--ua-text-hero-value-size', '--ua-text-hero-value-weight'],
] as const;

/* The canonical scale (§3.6). One entry per token — no aliases. */
const RADIUS_SCALE = [
  ['none', '--ua-radius-none'],
  ['xs', '--ua-radius-xs'],
  ['control', '--ua-radius-control'],
  ['surface', '--ua-radius-surface'],
  ['overlay', '--ua-radius-overlay'],
  ['round', '--ua-radius-round'],
] as const;

const SAMPLE_ROWS = [
  { id: 'ORD-1042', status: 'evidence_needed', amount: '$185.00' },
  { id: 'ORD-1043', status: 'resolved_won', amount: '$92.40' },
  { id: 'ORD-1044', status: 'escalated', amount: '$310.00' },
];

/* Registry-surface fixture rows (§8.3 / LP-CMP-11): identity left-aligned,
 * numeric/amount columns right-aligned tabular. */
const REGISTRY_ROWS = [
  { id: 'acme', name: 'Acme Supplies', status: 'ready_for_decision', cases: 4, exposure: '$1,240.00', last: '2026-07-28T18:40:00.000Z' },
  { id: 'brightline', name: 'Brightline Co.', status: 'awaiting_carrier_response', cases: 1, exposure: '$96.10', last: '2026-07-28T14:05:00.000Z' },
  { id: 'crest', name: 'Crest & Vale', status: 'resolved_refunded', cases: 12, exposure: '$4,802.55', last: '2026-07-27T09:22:00.000Z' },
] as const;

/*
 * §7.5 / LP-MOT-07 in a real hook, not a mock of the contract: `useAsyncResource`
 * drives the ResourceSnapshot lifecycle. `reload()` refreshes in place — the
 * table stays populated, the status flips to `refreshing`, and `dataAsOf` (from
 * the domain payload, never fetch-completion time) only advances when the new
 * result lands. The loader runs on mount and on each Refresh; it is never called
 * during SSR, so reading the clock inside it carries no hydration risk.
 */
function StaleWhileRefreshDemo() {
  const generationRef = useRef(0);
  const load = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    generationRef.current += 1;
    return { generation: generationRef.current, dataAsOf: new Date().toISOString() };
  }, []);
  const resource = useAsyncResource('gallery:stale-while-refresh', load, {
    getDataAsOf: (data) => data.dataAsOf,
  });

  const activity = resource.isRefreshing ? 'updating' : resource.status === 'error' ? 'failed' : 'idle';
  const freshness = resource.status === 'error' ? 'stale' : resource.dataAsOf ? 'current' : 'unknown';

  return (
    <div className="grid w-full gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => resource.reload()}
          disabled={resource.isInitialLoading}
        >
          Refresh
        </Button>
        <LivenessIndicator
          transport="connected"
          activity={activity}
          freshness={freshness}
          lastDataAt={resource.dataAsOf}
          snapshot
        />
      </div>
      <InsetGroup>
        <dl className="grid gap-1 text-[length:var(--ua-text-dense-size)]">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--ua-text-tertiary)]">status</dt>
            <dd className="font-mono text-[var(--ua-text-primary)]">{resource.status}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--ua-text-tertiary)]">data (preserved across refresh)</dt>
            <dd className="font-mono text-[var(--ua-text-primary)]">
              {resource.data ? `generation ${resource.data.generation}` : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--ua-text-tertiary)]">dataAsOf</dt>
            <dd className="text-[var(--ua-text-secondary)]">
              <Recency timestampIso={resource.dataAsOf} snapshot />
            </dd>
          </div>
        </dl>
      </InsetGroup>
    </div>
  );
}

/* §5.4/§8.1 (LP-CMP-07): grouped settings navigation — always-visible labelled
 * sections instead of a ten-item horizontal-scroll strip. */
const SETTINGS_NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { href: '/settings/account', label: 'Workspace & account' },
      { href: '/settings/team', label: 'Team' },
      { href: '/settings/billing', label: 'Billing' },
      { href: '/settings/platform', label: 'Defaults' },
      { href: '/settings/notifications', label: 'Notifications' },
    ],
  },
  {
    label: 'Connections',
    items: [
      { href: '/integrations', label: 'Connections' },
      { href: '/settings/api-integrations', label: 'API access' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/settings/agreements', label: 'Agreements' },
      { href: '/settings/data-privacy', label: 'Data & privacy' },
      { href: '/settings/audit-trail', label: 'Audit trail' },
    ],
  },
];

/* §5.2/§8.4 (LP-CMP-06): the recovery board's eight stages. The board scrolls
 * inside its working surface at a fixed readable column width. */
const BOARD_COLUMNS = [
  { title: 'Collecting evidence', count: 6 },
  { title: 'Pack ready', count: 3 },
  { title: 'Submitted / waiting', count: 5 },
  { title: 'Needs correspondence', count: 2 },
  { title: 'Source approved', count: 4 },
  { title: 'Source denied', count: 1 },
  { title: 'Recovered', count: 9 },
  { title: 'Closed unrecoverable', count: 2 },
];

/*
 * §7.2 / LP-MOT-10: the one-shot changed-value wash on a real consumer.
 * `MetricCard` reads `useChangedValueHighlight(value)`; the first mount never
 * washes, and each later value change washes exactly once for 700ms. "Recover"
 * changes the value (wash); "Re-render (same value)" forces a re-render with an
 * unchanged value (no wash — the guard compares the previous value, not mount).
 */
function ChangedValueWashDemo() {
  const [recovered, setRecovered] = useState(4820);
  const [, forceRerender] = useState(0);
  return (
    <div className="grid w-full gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setRecovered((v) => v + 180)}>
          Recover £180 (value changes → wash)
        </Button>
        <Button size="sm" variant="secondary" onClick={() => forceRerender((n) => n + 1)}>
          Re-render (same value → no wash)
        </Button>
      </div>
      <div style={{ maxWidth: 240 }}>
        <MetricCard label="Recovered" value={`£${formatNumber(recovered)}`} />
      </div>
    </div>
  );
}

export function DesignSystemGalleryClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [segment, setSegment] = useState('active');
  const [tab, setTab] = useState('overview');
  const [registrySelected, setRegistrySelected] = useState<string | null>('acme');
  const [registryFiltered, setRegistryFiltered] = useState(false);
  const toast = useToast();

  return (
    <PageFrame
      title="Authenticated design system"
      subtitle="Visual regression inspection for the shared signed-in interface. This route is unavailable outside development."
    >

      <GallerySection title="Colour — surfaces">
        {SURFACE_SWATCHES.map(([name, v]) => (
          <Swatch key={v} name={name} cssVar={v} />
        ))}
      </GallerySection>

      <GallerySection title="Colour — accent (§3.2)">
        {ACCENT_SWATCHES.map(([name, v]) => (
          <Swatch key={v} name={name} cssVar={v} />
        ))}
      </GallerySection>

      <GallerySection title="Colour — action roles (§3.2)">
        {ACTION_SWATCHES.map(([name, v]) => (
          <Swatch key={v} name={name} cssVar={v} />
        ))}
      </GallerySection>

      <GallerySection title="Colour — semantic">
        {SEMANTIC_SWATCHES.map(([name, v]) => (
          <Swatch key={v} name={name} cssVar={v} />
        ))}
      </GallerySection>

      <GallerySection title="Text hierarchy">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ua-space-3)', width: '100%' }}>
          {TYPE_ROLES.map(([name, sizeVar, weightVar]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--ua-space-4)' }}>
              <span
                style={{
                  fontSize: `var(${sizeVar})`,
                  fontWeight: `var(${weightVar})` as unknown as number,
                  color: 'var(--ua-text-primary)',
                }}
              >
                {name}
              </span>
              <span className="text-caption" style={{ color: 'var(--ua-text-tertiary)', fontFamily: 'var(--ua-font-mono)' }}>
                {sizeVar} / {weightVar}
              </span>
            </div>
          ))}
        </div>
      </GallerySection>

      <GallerySection title="Radius scale">
        {RADIUS_SCALE.map(([name, v]) => (
          <div key={v} style={{ width: 100, textAlign: 'center' }}>
            <div
              style={{
                height: 64,
                width: 64,
                margin: '0 auto',
                background: 'var(--ua-surface-secondary)',
                border: '1px solid var(--ua-border-default)',
                borderRadius: `var(${v})`,
              }}
            />
            <p className="text-caption" style={{ marginTop: 'var(--ua-space-1)', color: 'var(--ua-text-secondary)' }}>
              {name}
            </p>
          </div>
        ))}
      </GallerySection>

      <GallerySection title="Buttons">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="link">Link</Button>
        <span data-capture-static-state="true">
          <Button variant="primary" loading>
            Loading
          </Button>
        </span>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </GallerySection>

      <GallerySection title="Inputs">
        <Input placeholder="Input" style={{ width: 220 }} />
        <Select style={{ width: 220 }}>
          <option>Option A</option>
          <option>Option B</option>
        </Select>
      </GallerySection>

      <GallerySection title="Filters and view selection">
        <FilterChip active onClick={() => undefined} count={12}>Active cases</FilterChip>
        <FilterChip onClick={() => undefined}>Needs review</FilterChip>
        <FilterChip onClick={() => undefined}>All historical evidence awaiting review</FilterChip>
        <FilterChip disabled>Unavailable</FilterChip>
        <SegmentedControl
          aria-label="Gallery view"
          value={segment}
          onValueChange={setSegment}
          items={[{ value: 'active', label: 'Active' }, { value: 'all', label: 'All records' }, { value: 'saved', label: 'Saved' }]}
        />
      </GallerySection>

      <GallerySection title="In-page tabs">
        <div className="w-full">
          <Tabs
            aria-label="Gallery sections"
            id="gallery-tabs"
            value={tab}
            onValueChange={setTab}
            panelId="gallery-tab-panel"
            items={[{ value: 'overview', label: 'Overview' }, { value: 'evidence', label: 'Evidence' }, { value: 'history', label: 'History' }]}
          />
          <div id="gallery-tab-panel" role="tabpanel" aria-labelledby="gallery-tabs-tab-overview" className="mt-3 text-small text-[var(--ua-text-secondary)]">
            {tab === 'overview' ? 'A true tab uses arrow keys and controls this panel.' : `${tab} selected`}
          </div>
        </div>
      </GallerySection>

      <GallerySection title="Statuses">
        <StatusBadge family="caseStatus" value="new" />
        <StatusBadge family="caseStatus" value="manual_review" />
        <StatusBadge family="caseStatus" value="ready_for_decision" />
        <StatusBadge family="caseStatus" value="resolved_won" />
        <StatusBadge family="caseStatus" value="escalated" />
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="accent">Accent</Badge>
        <Badge tone="danger">Danger</Badge>
      </GallerySection>

      <GallerySection title="Instrument Grade — evidence, value, sources, and decisions">
        <div className="grid w-full gap-5 xl:grid-cols-2">
          <Surface structure="working" pad="standard">
            <EvidenceThread
              label="Evidence authority chain"
              items={[
                { key: 'source', authority: 'source', label: 'Source', value: 'Shopify order and fulfilment record', meta: 'Observed 09:18' },
                { key: 'fact', authority: 'fact', label: 'Verified fact', value: 'Carrier scan has not advanced for 10 days', meta: 'Current' },
                { key: 'inference', authority: 'inference', label: 'Inference', value: 'The parcel may be lost in transit', meta: 'Qualified', state: 'partial' },
                { key: 'recommendation', authority: 'recommendation', label: 'Recommendation', value: 'Review for merchant payout decision', meta: 'Advisory' },
              ]}
            />
          </Surface>
          <Surface structure="working" pad="standard">
            <FinancialEquation
              label="Financial position"
              items={[
                { key: 'exposure', label: 'Exposure', value: '£1,840', detail: 'Verified value' },
                { key: 'recovered', label: 'Recovered', value: '£420', detail: 'Observed cash' },
                { key: 'net', label: 'Net loss', value: '£1,420', detail: 'Reconciled position' },
              ]}
              conclusion="Only source-backed values enter the financial ledger."
            />
          </Surface>
          <Surface structure="working" pad="standard">
            <SourceBeacon source="Shopify orders" authority="Connected source" observedAt="Latest 09:18" state="current" limitation="1,284 current · 0 stale" />
            <SourceBeacon source="Carrier tracking" authority="Connected source" observedAt="Latest yesterday" state="stale" limitation="12 records need refresh" />
          </Surface>
          <Surface structure="working" pad="standard" className="grid gap-4">
            <FormField label="Decision rationale" hint="Required for denials and reversals.">
              <Input placeholder="Add source-backed rationale" />
            </FormField>
            <Switch label="Notify the case owner" description="Creates an in-app notification after the decision is recorded." defaultChecked />
          </Surface>
        </div>
      </GallerySection>

      <GallerySection title="Surface anatomy (§8.2)">
        <Surface structure="working" pad="standard" style={{ width: 200 }}>
          Working surface
        </Surface>
        <Surface structure="inset" style={{ width: 200 }}>
          Inset group
        </Surface>
        <Surface structure="floating" pad="standard" style={{ width: 200 }}>
          Floating surface
        </Surface>
        <Surface structure="unframed" style={{ width: 200 }}>
          Unframed grouping (spacing only)
        </Surface>
        {/* One working surface owns the perimeter; joined sections and an inset
            group compose inside it — no standard bordered card nested in
            another (§8.2). */}
        <div style={{ width: 280 }}>
          <Surface structure="working">
            <JoinedSection>Joined section with a single parent perimeter.</JoinedSection>
            <JoinedSection>
              <InsetGroup>Inset group for secondary context.</InsetGroup>
            </JoinedSection>
          </Surface>
        </div>
      </GallerySection>

      <GallerySection title="Cards and sections">
        <Card variant="panel" style={{ width: 220 }}>
          Padded card (delegates to a working surface)
        </Card>
        <MetricCard label="Payout exposure" value={18400} />
        <div style={{ width: 260 }}>
          <SectionCard title="Section card" description="Descriptive text">
            Body content
          </SectionCard>
        </div>
      </GallerySection>

      {/*
       * Adaptive KPI group (§5.3, LP-CMP-02): the grid sizes to its content at
       * 1, 2, 4, 5, and 6 metrics with no empty cell or orphan divider. Each is
       * a distinct data-count so the reflow rules in surfaces.css are exercised.
       * A route drops the KPI group entirely rather than pad it (see the
       * one-metric lead below and the no-KPI rule in §5.3 / PageFrame).
       */}
      <GallerySection title="Metric group — 1 (lead metric, intentional whitespace)">
        <MetricGroup
          items={[{ label: 'Recovered this period', value: '£4,820', description: 'Across 24 resolved cases' }]}
          aria-label="Lead metric example"
        />
      </GallerySection>

      <GallerySection title="Metric group — 2">
        <MetricGroup
          items={[
            { label: 'Open cases', value: '24', description: 'Current scope' },
            { label: 'Needs review', value: '8', description: 'Actionable' },
          ]}
          aria-label="Two-metric group"
        />
      </GallerySection>

      <GallerySection title="Metric group — 3 (odd count)">
        <MetricGroup
          items={[
            { label: 'Open cases', value: '24', description: 'Current scope' },
            { label: 'Needs review', value: '8', description: 'Actionable' },
            { label: 'Recovered', value: '£4,820', description: 'This period' },
          ]}
          aria-label="Three-metric group"
        />
      </GallerySection>

      <GallerySection title="Metric group — 4">
        <MetricGroup
          items={[
            { label: 'Open cases', value: '24' },
            { label: 'Needs review', value: '8' },
            { label: 'Recovered', value: '£4,820' },
            { label: 'Win rate', value: '61%' },
          ]}
          aria-label="Four-metric group"
        />
      </GallerySection>

      <GallerySection title="Metric group — 5">
        <MetricGroup
          items={[
            { label: 'Open cases', value: '24' },
            { label: 'Needs review', value: '8' },
            { label: 'Recovered', value: '£4,820' },
            { label: 'Win rate', value: '61%' },
            { label: 'Avg. resolution', value: '3.2d' },
          ]}
          aria-label="Five-metric group"
        />
      </GallerySection>

      <GallerySection title="Metric group — 6">
        <MetricGroup
          items={[
            { label: 'Open cases', value: '24' },
            { label: 'Needs review', value: '8' },
            { label: 'Recovered', value: '£4,820' },
            { label: 'Win rate', value: '61%' },
            { label: 'Avg. resolution', value: '3.2d' },
            { label: 'Escalated', value: '2' },
          ]}
          aria-label="Six-metric group"
        />
      </GallerySection>

      <GallerySection title="Table row">
        <div style={{ width: '100%' }}>
          <DataTable
            columns={[
              { key: 'id', header: 'Order', render: (r) => r.id },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge family="caseStatus" value={r.status} size="sm" /> },
              { key: 'amount', header: 'Amount', align: 'right', render: (r) => r.amount },
            ]}
            rows={SAMPLE_ROWS}
            getRowKey={(r) => r.id}
            emptyState={<p className="p-4 text-sm text-[var(--ua-text-secondary)]">No sample rows.</p>}
          />
        </div>
      </GallerySection>

      <GallerySection title="Registry surface (§8.3 — toolbar, count, table, pagination in one working surface)">
        <div style={{ width: '100%' }}>
          <RegistrySurface
            aria-label="Cases registry"
            toolbar={
              <>
                <FilterChip active={!registryFiltered} onClick={() => setRegistryFiltered(false)}>
                  All
                </FilterChip>
                <FilterChip active={registryFiltered} onClick={() => setRegistryFiltered(true)} count={0}>
                  No exposure
                </FilterChip>
              </>
            }
            resultCount={
              registryFiltered
                ? 'No matching records'
                : `Showing 1–${REGISTRY_ROWS.length} of ${REGISTRY_ROWS.length}`
            }
            pagination={
              <>
                <span>Page 1 of 1</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" disabled>Prev</Button>
                  <Button size="sm" variant="secondary" disabled>Next</Button>
                </div>
              </>
            }
          >
            {registryFiltered ? (
              <OperationalState
                kind="filtered-empty"
                action={
                  <Button size="sm" variant="secondary" onClick={() => setRegistryFiltered(false)}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <DataTable
                flush
                aria-label="Cases registry"
                columns={[
                  { key: 'name', header: 'Customer', render: (r) => r.name },
                  { key: 'status', header: 'Status', render: (r) => <StatusBadge family="caseStatus" value={r.status} size="sm" /> },
                  { key: 'cases', header: 'Cases', align: 'right', render: (r) => r.cases },
                  { key: 'exposure', header: 'Exposure', align: 'right', render: (r) => r.exposure },
                  { key: 'last', header: 'Last activity', align: 'right', render: (r) => <Recency timestampIso={r.last} /> },
                ]}
                rows={[...REGISTRY_ROWS]}
                getRowKey={(r) => r.id}
                emptyState={<p className="p-4 text-sm text-[var(--ua-text-secondary)]">No registry rows.</p>}
                selectedKey={registrySelected ?? undefined}
                onRowClick={(r) => setRegistrySelected(r.id)}
                primaryColumnKey="name"
                primaryActionLabel={(r) => `Open ${r.name}`}
                rowActions={(r) => [{ label: 'Open record', onSelect: () => setRegistrySelected(r.id) }]}
              />
            )}
          </RegistrySurface>
        </div>
      </GallerySection>

      <GallerySection title="Stale-while-refresh (§7.5 / LP-MOT-07 — refresh preserves data, advances dataAsOf)">
        <StaleWhileRefreshDemo />
      </GallerySection>

      <GallerySection title="Selection vs. status (LP-CMP-10 — selection is accent, never a semantic tone)">
        <div className="grid w-full gap-3 md:grid-cols-2">
          <InsetGroup>
            <p className="mb-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">Selection — accent</p>
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip active onClick={() => undefined}>Selected filter</FilterChip>
              <FilterChip onClick={() => undefined}>Unselected</FilterChip>
              <SegmentedControl
                aria-label="View"
                value={segment}
                onValueChange={setSegment}
                items={[{ value: 'active', label: 'Active' }, { value: 'all', label: 'All' }]}
              />
            </div>
          </InsetGroup>
          <InsetGroup>
            <p className="mb-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">Status — semantic meaning</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge family="caseStatus" value="ready_for_decision" size="sm" />
              <StatusBadge family="caseStatus" value="awaiting_carrier_response" size="sm" />
              <StatusBadge family="caseStatus" value="escalated" size="sm" />
            </div>
          </InsetGroup>
        </div>
      </GallerySection>

      <GallerySection title="Empty state">
        <div style={{ width: '100%', border: '1px solid var(--ua-border-default)', borderRadius: 'var(--ua-radius-surface)' }}>
          <EmptyState
            title="No records yet"
            description="Records appear here once data arrives."
            action={<Button variant="secondary" size="sm">Clear filters</Button>}
          />
        </div>
      </GallerySection>

      <GallerySection title="Qualified status">
        <StatusWithReason
          family="workflowStatus"
          value="degraded"
          reason="The latest source check did not complete. Existing evidence remains available while the connection is reviewed."
        />
      </GallerySection>

      <GallerySection title="Operational states">
        <div className="grid w-full gap-3 md:grid-cols-2">
          <OperationalState kind="zero" />
          <OperationalState kind="empty" />
          <OperationalState kind="filtered-empty" />
          <OperationalState kind="partial" />
          <OperationalState kind="stale" />
          <OperationalState kind="disconnected" />
          <OperationalState kind="unavailable" />
          <OperationalState kind="permission" />
          <OperationalState kind="locked" />
          <OperationalState kind="error" action={<Button variant="secondary" size="sm">Try again</Button>} />
        </div>
      </GallerySection>

      <div className="contents" data-capture-static-state="true">
        <GallerySection title="Loading geometry">
          <LoadingSkeleton variant="metric-group" title="Loading metrics" className="w-full" />
          <LoadingSkeleton variant="table" rows={3} title="Loading cases" className="w-full" />
        </GallerySection>

        <GallerySection title="Spinner (§7.6, 150ms display threshold)">
          <Spinner delayMs={0} label="Loading" />
          <Spinner delayMs={0} size="lg" label="Loading" />
        </GallerySection>

        <GallerySection title="Liveness — transport / activity / freshness / live (§7.4)">
          {/*
            Fixed demo timestamps, not `Date.now()`-derived — a value computed
            from the client's clock inside a client component would differ
            between SSR and hydration and reintroduce the mismatch this
            consolidation fixed. Real callers pass genuine domain timestamps
            from an API response, which carry no such risk.
          */}
          <div className="grid w-full gap-2">
            <LivenessIndicator transport="connected" freshness="current" lastDataAt="2026-07-28T19:59:30.000Z" />
            <LivenessIndicator transport="connected" freshness="stale" lastDataAt="2026-07-28T16:42:00.000Z" />
            <LivenessIndicator transport="offline" freshness="unknown" lastDataAt={null} />
            <LivenessIndicator transport="connected" activity="syncing" freshness="current" lastDataAt="2026-07-28T19:59:55.000Z" />
            <LivenessIndicator
              transport="connected"
              freshness="current"
              live={{ heartbeatExpiresAt: '2030-01-01T00:00:00.000Z' }}
              lastDataAt="2026-07-28T19:59:58.000Z"
            />
            <LivenessIndicator transport="connected" freshness="current" lastDataAt="2026-07-28T18:59:00.000Z" snapshot />
          </div>
        </GallerySection>
      </div>

      <GallerySection title="Data visualisation — cartesian frame + semantic fills">
        <div style={{ display: 'flex', gap: 'var(--ua-space-4)', alignItems: 'flex-end', width: '100%' }}>
          <div style={{ width: 220, height: 90, position: 'relative', borderBottom: '1px solid var(--ua-chart-grid)' }}>
            <div className={chartStyles.frameGrid} style={{ position: 'absolute', inset: 0 }} />
            <span style={{ position: 'absolute', top: 0, right: '100%', marginRight: 6 }} className={chartStyles.frameYAxis}>100</span>
            <span style={{ position: 'absolute', bottom: 0, right: '100%', marginRight: 6 }} className={chartStyles.frameYAxis}>0</span>
          </div>
          {CHART_SLOTS.map((slot) => (
            <div key={slot.token} style={{ textAlign: 'center' }}>
              <svg width="56" height="56" aria-hidden="true">
                <rect width="56" height="56" fill={`var(${slot.token})`} fillOpacity={slot.token === '--ua-chart-neutral-700' ? 0.35 : 0.18} />
              </svg>
              <p className="text-caption" style={{ color: 'var(--ua-text-tertiary)' }}>{slot.label}</p>
            </div>
          ))}
        </div>
      </GallerySection>

      <GallerySection title="T3 trend line + flat area wash">
        <svg width="240" height="90" aria-hidden="true">
          <polygon points="0,70 40,50 80,58 120,30 160,40 200,20 240,32 240,90 0,90" fill="var(--ua-chart-primary)" fillOpacity="0.08" />
          <polyline points="0,70 40,50 80,58 120,30 160,40 200,20 240,32" fill="none" stroke="var(--ua-chart-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="200" cy="20" r="4" fill="var(--ua-chart-primary)" stroke="var(--ua-surface-primary)" strokeWidth="2" />
        </svg>
      </GallerySection>

      <GallerySection title="T4 flat bars + dashed comparison">
        <svg width="220" height="100" aria-hidden="true">
          {[60, 40, 75, 30, 55].map((h, i) => (
            <g key={i}>
              <rect x={10 + i * 42} y={90 - h} width={30} height={h} fill="var(--ua-warning)" fillOpacity="0.72" rx={6} />
            </g>
          ))}
          <polyline points="22,55 64,60 106,35 148,50 190,45" fill="none" stroke="var(--ua-icon-secondary)" strokeWidth="1.5" strokeDasharray="5 4" />
        </svg>
      </GallerySection>

      <GallerySection title="T5 dot-matrix activity grid">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(13, ${MATRIX_CELL}px)`, gap: MATRIX_GAP }}>
          {Array.from({ length: 52 }, (_, i) => {
            const intensity = (i * 7) % 5;
            const bg = intensity === 0 ? 'var(--ua-chart-track)' : `var(--ua-chart-ramp-${Math.min(intensity, 4)})`;
            return <div key={i} style={{ width: MATRIX_CELL, height: MATRIX_CELL, borderRadius: MATRIX_RADIUS, background: bg }} />;
          })}
        </div>
      </GallerySection>

      <GallerySection title="T6 block rail with pins + neutral remainder">
        <svg width="320" height={RAIL_HEIGHT + 30} aria-hidden="true">
          <g transform="translate(0,26)">
            <rect x="0" y="0" width="180" height={RAIL_HEIGHT} rx={RAIL_BLOCK_RADIUS} fill="var(--ua-chart-primary)" />
            <rect x={180 + RAIL_BLOCK_GAP} y="0" width={320 - 180 - RAIL_BLOCK_GAP} height={RAIL_HEIGHT} rx={RAIL_BLOCK_RADIUS} fill="var(--ua-chart-track)" />
            <line x1="180" y1="-16" x2="180" y2="0" stroke="var(--ua-border-strong)" strokeWidth="1" />
          </g>
          <text x="180" y="14" textAnchor="middle" fontSize="10" fontFamily="var(--ua-font-sans)" fill="var(--ua-text-primary)" fontWeight={500}>62%</text>
        </svg>
      </GallerySection>

      <GallerySection title="T7 tick meter">
        <div style={{ width: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--ua-text-secondary)' }}>Evidence complete</span>
            <span className={chartStyles.mono} style={{ fontSize: 13, fontWeight: 500, color: 'var(--ua-text-primary)' }}>72%</span>
          </div>
          <div style={{ display: 'flex', gap: TICK_GAP }}>
            {Array.from({ length: 40 }, (_, i) => (
              <div key={i} style={{ width: TICK_W, height: TICK_H, borderRadius: TICK_RADIUS, background: i < 29 ? 'var(--ua-success)' : 'var(--ua-chart-track)' }} />
            ))}
          </div>
          <p className={chartStyles.caption} style={{ marginTop: 4 }}>Most cases carried full evidence</p>
        </div>
      </GallerySection>

      <GallerySection title="T8 segment composition + dot legend">
        <div style={{ width: 280 }}>
          <div style={{ display: 'flex', height: SEGMENT_BAR_H, gap: SEGMENT_GAP }}>
            <div style={{ flex: 3, borderRadius: SEGMENT_RADIUS, background: 'var(--ua-warning)' }} />
            <div style={{ flex: 2, borderRadius: SEGMENT_RADIUS, background: 'var(--ua-chart-primary)' }} />
            <div style={{ flex: 1, borderRadius: SEGMENT_RADIUS, background: 'var(--ua-chart-neutral-700)' }} />
          </div>
          <ul style={{ display: 'flex', gap: 12, marginTop: 8, padding: 0, listStyle: 'none' }}>
            {[CHART_SLOTS[0], CHART_SLOTS[3], CHART_SLOTS[5]].map((slot) => (
              <li key={slot.token} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ua-text-secondary)' }}>
                <i style={{ width: 6, height: 6, borderRadius: '50%', background: `var(${slot.token})` }} /> {slot.label}
              </li>
            ))}
          </ul>
        </div>
      </GallerySection>

      <GallerySection title="T9 metric tab strip">
        <div style={{ display: 'flex', width: 320, borderTop: '1px solid var(--ua-border-subtle)' }}>
          {['Exposure', 'Recovered'].map((label, i) => (
            <div key={label} style={{ flex: 1, padding: '10px 12px', borderRight: i === 0 ? '1px solid var(--ua-border-subtle)' : undefined, background: i === 0 ? 'var(--ua-surface-muted, var(--ua-surface-secondary))' : undefined }}>
              <div style={{ width: TAB_ICON_CHIP, height: TAB_ICON_CHIP, borderRadius: 4, background: i === 0 ? 'var(--ua-surface-inverse)' : 'var(--ua-surface-secondary)', marginBottom: 6 }} />
              <p style={{ fontSize: 12, color: 'var(--ua-text-secondary)', margin: 0 }}>{label}</p>
              <p className={chartStyles.mono} style={{ fontSize: 20, fontWeight: 500, color: 'var(--ua-text-primary)', margin: '2px 0' }}>$18,400</p>
              <p style={{ fontSize: 12, color: 'var(--ua-risk-low)', margin: 0 }}>↑ 4.2% <span style={{ color: 'var(--ua-text-tertiary)' }}>vs previous period</span></p>
            </div>
          ))}
        </div>
      </GallerySection>

      <GallerySection title="T10 cursor + tooltip">
        <div style={{ position: 'relative', width: 200, height: 90, borderBottom: '1px dashed var(--ua-border-strong)' }}>
          <ChartTooltip value="$4,820" caption="Jul 14" series={[{ label: 'Exposure', value: '$4,820', colour: 'var(--ua-warning)' }]} />
        </div>
      </GallerySection>

      <GallerySection title="Shared chart frame — §6.4 anatomy (Phase 06 · LP-VIZ-02)">
        <div style={{ width: 'min(560px, 100%)' }}>
          <ChartFrame
            id="gallery-hero"
            kind="cumulative-financial"
            question="How is preventable value exposure improving?"
            summary="Cumulative exposure and recovered value"
            scope="GBP · Last 30 days"
            control={<div className={chartStyles.annotation}><strong>£18,400</strong> exposed</div>}
            legend={<ChartLegend items={[
              { label: 'Exposure', tone: 'primary' },
              { label: 'Recovered', tone: 'positive' },
              { label: 'Previous period', tone: 'comparison' },
            ]} />}
            freshness="Source: case ledger · updated 2 minutes ago"
            records={{ href: '#chart-records' }}
            table={{
              caption: 'Exposure and recovered value by day (GBP)',
              columns: [
                { key: 'day', header: 'Day' },
                { key: 'exposure', header: 'Exposure', numeric: true },
                { key: 'recovered', header: 'Recovered', numeric: true },
              ],
              rows: [
                { key: 'd1', header: '12 Jul', values: ['£4,820', '£1,200'] },
                { key: 'd2', header: '13 Jul', values: ['£9,140', '£3,600'] },
                { key: 'd3', header: '14 Jul', values: ['£18,400', '£7,900'] },
              ],
            }}
          >
            <svg width="100%" height="180" viewBox="0 0 480 180" preserveAspectRatio="none" role="img" aria-label="Exposure rising to £18,400 while recovered value trails.">
              <polyline points="0,150 120,110 240,120 360,60 480,40" fill="none" stroke="var(--ua-chart-neutral-500)" strokeWidth="1.5" strokeDasharray="5 4" />
              <polygon points="0,150 120,90 240,100 360,44 480,26 480,180 0,180" fill="var(--ua-chart-primary)" fillOpacity="0.08" />
              <polyline points="0,150 120,90 240,100 360,44 480,26" fill="none" stroke="var(--ua-chart-primary)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="480" cy="26" r="5" fill="var(--ua-chart-primary)" stroke="var(--ua-surface-primary)" strokeWidth="2" />
            </svg>
          </ChartFrame>
        </div>
      </GallerySection>

      <GallerySection title="Chart data states — §6.6 matrix (Phase 06 · LP-VIZ-07)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--ua-space-3)', width: '100%' }}>
          {([
            { kind: 'empty', title: 'No records yet', description: 'Cases with a recorded amount and currency will appear here.' },
            { kind: 'filtered-empty', title: 'No matches', description: 'No records match the current filters.', action: <Button variant="secondary" size="sm">Clear filters</Button> },
            { kind: 'insufficient-history', title: 'Not enough history', description: 'A period comparison needs at least seven days of data.' },
            { kind: 'partial', title: 'Partial interval', description: 'The latest day is still accumulating; it is marked incomplete.' },
            { kind: 'stale', title: 'Showing last known values', description: 'The source has not refreshed since 08:00.' },
            { kind: 'disconnected', title: 'Source disconnected', description: 'Reconnect Shopify to resume this chart.', action: <Button variant="secondary" size="sm">Open integration</Button> },
            { kind: 'error', title: 'Could not load chart', description: 'The last successful data is preserved.', action: <Button variant="secondary" size="sm">Retry</Button> },
            { kind: 'mixed-currency', title: 'Mixed currency', description: 'Values span GBP and USD; split by currency to aggregate.' },
            { kind: 'unavailable', title: 'Dated values unavailable', description: 'Unavailable is distinct from zero.' },
            { kind: 'refreshing', title: 'Updating…', description: 'Refreshing in the background; existing values stay visible.' },
          ] satisfies Array<{ kind: ChartStateKind; title: string; description: string; action?: React.ReactNode }>).map((state) => (
            <div key={state.kind} style={{ border: '1px solid var(--ua-border-subtle)', borderRadius: 'var(--ua-radius-surface)', overflow: 'hidden' }}>
              <p className="text-caption" style={{ margin: 0, padding: '6px 10px', borderBottom: '1px solid var(--ua-border-subtle)', color: 'var(--ua-text-tertiary)' }}>{state.kind}</p>
              <ChartState kind={state.kind} title={state.title} description={state.description} action={state.action} minHeight={130} />
            </div>
          ))}
        </div>
      </GallerySection>

      <GallerySection title="Detail header anatomy (§8.4 — LP-CMP-05)">
        <div style={{ width: '100%', border: '1px solid var(--ua-border-subtle)', borderRadius: 'var(--ua-radius-surface)', padding: 'var(--ua-space-4)' }}>
          <a className="ua-detail-back" href="#detail-specimen" onClick={(e) => e.preventDefault()}>
            <ArrowLeft size={15} aria-hidden="true" />
            Recoveries
          </a>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div style={{ color: 'var(--ua-text-primary)', fontSize: 'var(--ua-text-detail-identity-size)', fontWeight: 'var(--ua-text-detail-identity-weight)', lineHeight: 'var(--ua-text-detail-identity-leading)' }}>
                Late delivery · R-4821
              </div>
              <ul className="ua-detail-meta mt-1">
                <li className="ua-detail-meta__item">
                  <span className="ua-detail-meta__label">Source</span>
                  <span className="ua-detail-meta__value">Shopify</span>
                </li>
                <li className="ua-detail-meta__item">
                  <span className="ua-detail-meta__label">Owner</span>
                  <span className="ua-detail-meta__value">A. Okafor</span>
                </li>
                <li className="ua-detail-meta__item">
                  <span className="ua-detail-meta__label">Updated</span>
                  <span className="ua-detail-meta__value"><Recency timestampIso="2026-07-29T09:10:00.000Z" /></span>
                </li>
              </ul>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge family="caseStatus" value="ready_for_decision" size="sm" />
              <nav className="ua-detail-recordnav" aria-label="Record navigation">
                <span className="ua-detail-recordnav__link" aria-disabled="true" aria-label="Previous record">
                  <ChevronLeft size={16} aria-hidden="true" />
                </span>
                <a className="ua-detail-recordnav__link" href="#detail-next" aria-label="Next record" onClick={(e) => e.preventDefault()}>
                  <ChevronRight size={16} aria-hidden="true" />
                </a>
              </nav>
            </div>
          </div>
        </div>
      </GallerySection>

      <GallerySection title="Board geometry — 8 stages scroll inside the surface (§5.2/§8.4 — LP-CMP-06)">
        <Surface structure="working" className="w-full" style={{ overflow: 'hidden' }}>
          <div className="ua-board" aria-label="Recovery board (specimen)">
            {BOARD_COLUMNS.map((column) => (
              <div key={column.title} className="ua-board__column">
                <div className="ua-board__column-header">
                  <span className="ua-board__column-title">{column.title}</span>
                  <span className="ua-board__count">{column.count}</span>
                </div>
                <div className="ua-board__column-body">
                  <Bone className="h-12 w-full" />
                  <Bone className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </GallerySection>

      <GallerySection title="Grouped settings navigation (§5.4/§8.1 — LP-CMP-07)">
        <div className="grid w-full gap-4">
          <div>
            <p className="mb-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">Horizontal — header rail (replaces the ten-tab scroll strip)</p>
            <SettingsNav groups={SETTINGS_NAV_GROUPS} currentPath="/settings/team" />
          </div>
          <div style={{ maxWidth: 240 }}>
            <p className="mb-2 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">Vertical — left-rail form variant</p>
            <SettingsNav groups={SETTINGS_NAV_GROUPS} currentPath="/settings/team" orientation="vertical" />
          </div>
        </div>
      </GallerySection>

      <GallerySection title="Builder / configuration shell (§8.5 — LP-CMP-08)">
        <div style={{ width: '100%' }}>
          <BuilderShell
            statusBadge={<StatusBadge family="caseStatus" value="ready_for_decision" size="sm" />}
            title="High-value late delivery"
            meta="Version 4 · Refund when tracking shows no movement for 10 days"
            actions={
              <>
                <Button size="sm" variant="secondary">Simulate</Button>
                <Button size="sm" variant="secondary">Edit draft</Button>
                <Button size="sm">Review publish</Button>
              </>
            }
            validation={
              <BuilderValidationSummary
                tone="blocking"
                title="1 requirement before publishing"
                items={['Connect a carrier tracking source to evaluate “no movement for 10 days”.']}
              />
            }
            preview={
              <InsetGroup>
                <p className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">Draft impact</p>
                <p className="mt-1 text-[length:var(--ua-text-dense-size)] text-[var(--ua-text-primary)]">Would have matched 14 of the last 200 cases.</p>
              </InsetGroup>
            }
          >
            <BuilderSequence aria-label="Rule sequence">
              <BuilderStep label="Trigger" detail="A recovery enters “Submitted / waiting”." />
              <BuilderStep label="Match conditions" detail="Order value ≥ £150 and no tracking movement for 10 days." />
              <BuilderStep label="Recommend" detail="Propose a refund and notify the owner." />
            </BuilderSequence>
          </BuilderShell>
        </div>
      </GallerySection>

      <GallerySection title="Changed-value wash (§7.2 — LP-MOT-10; no first-mount wash)">
        <ChangedValueWashDemo />
      </GallerySection>

      <GallerySection title="Overlays">
        <Button variant="secondary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
          Open drawer
        </Button>
        <Button variant="secondary" onClick={() => toast({ title: 'Saved', description: 'Change recorded.', tone: 'success' })}>
          Fire toast
        </Button>
        <Tooltip content="Supplemental help for this control">
          <IconButton label="More information" icon={<Info size={15} />} />
        </Tooltip>
      </GallerySection>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Modal title" description="Modal description">
        Modal body content.
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Drawer title">
        <div style={{ padding: 'var(--ua-space-4)' }}>Drawer body content.</div>
      </Drawer>
    </PageFrame>
  );
}
