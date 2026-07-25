'use client';

import { useState } from 'react';
import {
  Button,
  Badge,
  Card,
  DataTable,
  Drawer,
  EmptyState,
  Input,
  MetricCard,
  Modal,
  Select,
  SectionCard,
  StatusBadge,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { filterChipContract, segmentedControlContract } from '@/styles/authenticated/contracts';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';
import { ChartTooltip } from '@/components/charts/authenticated/core/ChartTooltip';
import chartStyles from '@/components/charts/authenticated/AuthenticatedCharts.module.css';
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
 * Spec §8.2 defines five numbered series slots plus neutral. Slots are named by
 * position and role, never by hue, so a recolour never invalidates the meaning.
 */
const CHART_SLOTS = [
  { token: '--ua-chart-1', label: '1 · primary' },
  { token: '--ua-chart-2', label: '2 · positive' },
  { token: '--ua-chart-3', label: '3 · secondary' },
  { token: '--ua-chart-4', label: '4 · attention' },
  { token: '--ua-chart-5', label: '5 · failure' },
  { token: '--ua-chart-neutral', label: 'neutral' },
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

const SEMANTIC_SWATCHES = [
  ['Success', '--ua-success-bg'],
  ['Warning', '--ua-warning-bg'],
  ['Critical', '--ua-critical-bg'],
  ['Info', '--ua-info-bg'],
] as const;

const TYPE_ROLES = [
  ['Page title', '--ua-text-page-title-size', '--ua-text-page-title-weight'],
  ['Section title', '--ua-text-section-title-size', '--ua-text-section-title-weight'],
  ['Card title', '--ua-text-card-title-size', '--ua-text-card-title-weight'],
  ['Body', '--ua-text-body-size', '--ua-text-body-weight'],
  ['Small', '--ua-text-small-size', '--ua-text-small-weight'],
  ['Caption', '--ua-text-caption-size', '--ua-text-caption-weight'],
  ['Micro', '--ua-text-micro-size', '--ua-text-micro-weight'],
] as const;

/* The canonical scale (spec §3.4). One entry per token — no aliases. */
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
  { id: 'ORD-1043', status: 'recovered', amount: '$92.40' },
  { id: 'ORD-1044', status: 'escalated', amount: '$310.00' },
];

export function DesignSystemGalleryClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const toast = useToast();

  return (
    <div>
      <AuthenticatedPageHeader
        title="Authenticated design system"
        subtitle="Visual regression inspection for the shared signed-in interface. This route is unavailable outside development."
      />
      <div className={pageStyles.pageBody}>
        <div className={pageStyles.workbenchStack}>

      <GallerySection title="Colour — surfaces">
        {SURFACE_SWATCHES.map(([name, v]) => (
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
        <Button variant="primary" loading>
          Loading
        </Button>
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

      <GallerySection title="Filter chips (draft contract — no component yet)">
        <span className={`${filterChipContract.base} ${filterChipContract.unselected} ${filterChipContract.hover}`}>
          Unselected
        </span>
        <span className={`${filterChipContract.base} ${filterChipContract.selected}`}>Selected</span>
        <span className={`${filterChipContract.base} ${filterChipContract.unselected} ${filterChipContract.disabled}`}>
          Disabled
        </span>
      </GallerySection>

      <GallerySection title="Segmented control (draft contract — no component yet)">
        <div className={segmentedControlContract.root}>
          <span className={`${segmentedControlContract.item} ${segmentedControlContract.itemHeight} ${segmentedControlContract.selectedItem}`}>
            7d
          </span>
          <span className={`${segmentedControlContract.item} ${segmentedControlContract.itemHeight}`}>30d</span>
          <span className={`${segmentedControlContract.item} ${segmentedControlContract.itemHeight}`}>90d</span>
        </div>
      </GallerySection>

      <GallerySection title="Statuses">
        <StatusBadge family="caseStatus" value="new" />
        <StatusBadge family="caseStatus" value="in_progress" />
        <StatusBadge family="caseStatus" value="chase_due" />
        <StatusBadge family="caseStatus" value="recovered" />
        <StatusBadge family="caseStatus" value="escalated" />
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="accent">Accent</Badge>
        <Badge tone="danger">Danger</Badge>
      </GallerySection>

      <GallerySection title="Cards">
        <Card variant="panel" style={{ width: 220 }}>
          Raised card
        </Card>
        <Card variant="overlay" style={{ width: 220 }}>
          Overlay card
        </Card>
        <Card variant="panel" style={{ width: 220 }}>
          Flat card
        </Card>
        <MetricCard label="Payout exposure" value={18400} />
        <div style={{ width: 260 }}>
          <SectionCard title="Section card" description="Descriptive text">
            Body content
          </SectionCard>
        </div>
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
          />
        </div>
      </GallerySection>

      <GallerySection title="Empty state">
        <div style={{ width: '100%', border: '1px solid var(--ua-border-default)', borderRadius: 'var(--ua-radius-surface)' }}>
          <EmptyState title="No records yet" description="Records appear here once data arrives." />
        </div>
      </GallerySection>

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
                <rect width="56" height="56" fill={`var(${slot.token})`} fillOpacity={slot.token === '--ua-chart-neutral' ? 0.35 : 0.18} />
              </svg>
              <p className="text-caption" style={{ color: 'var(--ua-text-tertiary)' }}>{slot.label}</p>
            </div>
          ))}
        </div>
      </GallerySection>

      <GallerySection title="T3 trend line + flat area wash">
        <svg width="240" height="90" aria-hidden="true">
          <polygon points="0,70 40,50 80,58 120,30 160,40 200,20 240,32 240,90 0,90" fill="var(--ua-chart-1)" fillOpacity="0.08" />
          <polyline points="0,70 40,50 80,58 120,30 160,40 200,20 240,32" fill="none" stroke="var(--ua-chart-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="200" cy="20" r="4" fill="var(--ua-chart-1)" stroke="var(--ua-surface-primary)" strokeWidth="2" />
        </svg>
      </GallerySection>

      <GallerySection title="T4 flat bars + dashed comparison">
        <svg width="220" height="100" aria-hidden="true">
          {[60, 40, 75, 30, 55].map((h, i) => (
            <g key={i}>
              <rect x={10 + i * 42} y={90 - h} width={30} height={h} fill="var(--ua-chart-4)" fillOpacity="0.72" rx={6} />
            </g>
          ))}
          <polyline points="22,55 64,60 106,35 148,50 190,45" fill="none" stroke="var(--ua-icon-secondary)" strokeWidth="1.5" strokeDasharray="5 4" />
        </svg>
      </GallerySection>

      <GallerySection title="T5 dot-matrix activity grid">
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(13, ${MATRIX_CELL}px)`, gap: MATRIX_GAP }}>
          {Array.from({ length: 52 }, (_, i) => {
            const intensity = (i * 7) % 5;
            const bg = intensity === 0 ? 'var(--ua-chart-track)' : `var(--ua-chart-ramp-primary-${Math.min(intensity, 4)})`;
            return <div key={i} style={{ width: MATRIX_CELL, height: MATRIX_CELL, borderRadius: MATRIX_RADIUS, background: bg }} />;
          })}
        </div>
      </GallerySection>

      <GallerySection title="T6 block rail with pins + neutral remainder">
        <svg width="320" height={RAIL_HEIGHT + 30} aria-hidden="true">
          <g transform="translate(0,26)">
            <rect x="0" y="0" width="180" height={RAIL_HEIGHT} rx={RAIL_BLOCK_RADIUS} fill="var(--ua-chart-1)" />
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
              <div key={i} style={{ width: TICK_W, height: TICK_H, borderRadius: TICK_RADIUS, background: i < 29 ? 'var(--ua-chart-2)' : 'var(--ua-chart-track)' }} />
            ))}
          </div>
          <p className={chartStyles.caption} style={{ marginTop: 4 }}>Most cases carried full evidence</p>
        </div>
      </GallerySection>

      <GallerySection title="T8 segment composition + dot legend">
        <div style={{ width: 280 }}>
          <div style={{ display: 'flex', height: SEGMENT_BAR_H, gap: SEGMENT_GAP }}>
            <div style={{ flex: 3, borderRadius: SEGMENT_RADIUS, background: 'var(--ua-chart-4)' }} />
            <div style={{ flex: 2, borderRadius: SEGMENT_RADIUS, background: 'var(--ua-chart-1)' }} />
            <div style={{ flex: 1, borderRadius: SEGMENT_RADIUS, background: 'var(--ua-chart-neutral)' }} />
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
          <ChartTooltip value="$4,820" caption="Jul 14" series={[{ label: 'Exposure', value: '$4,820', colour: 'var(--ua-chart-4)' }]} />
        </div>
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
      </GallerySection>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Modal title" description="Modal description">
        Modal body content.
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Drawer title">
        <div style={{ padding: 'var(--ua-space-4)' }}>Drawer body content.</div>
      </Drawer>
        </div>
      </div>
    </div>
  );
}
