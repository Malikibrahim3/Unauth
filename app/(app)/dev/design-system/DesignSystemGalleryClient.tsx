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

function GallerySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-9)' }}>
      <h2 className="text-h1" style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
        {children}
      </div>
    </section>
  );
}

function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div style={{ width: 140 }}>
      <div
        style={{
          height: 56,
          borderRadius: 'var(--ua-radius-card)',
          border: '1px solid var(--ua-border-default)',
          background: `var(${cssVar})`,
        }}
      />
      <p className="text-caption" style={{ marginTop: 'var(--space-1)', color: 'var(--ua-text-secondary)' }}>
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

const RADIUS_SCALE = [
  ['none', '--ua-radius-none'],
  ['sm', '--ua-radius-sm'],
  ['control', '--ua-radius-control'],
  ['input', '--ua-radius-input'],
  ['card', '--ua-radius-card'],
  ['overlay', '--ua-radius-overlay'],
  ['pill', '--ua-radius-pill'],
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
    <div style={{ padding: 'var(--space-8)', maxWidth: 1100 }}>
      <p className="text-caption" style={{ color: 'var(--ua-warning)', marginBottom: 'var(--space-6)' }}>
        Development only — this route 404s outside NODE_ENV=development. Visual regression inspection, not documentation.
      </p>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
          {TYPE_ROLES.map(([name, sizeVar, weightVar]) => (
            <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-4)' }}>
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
            <p className="text-caption" style={{ marginTop: 'var(--space-1)', color: 'var(--ua-text-secondary)' }}>
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
        <Card variant="raised" style={{ width: 220 }}>
          Raised card
        </Card>
        <Card variant="overlay" style={{ width: 220 }}>
          Overlay card
        </Card>
        <Card variant="flat" style={{ width: 220 }}>
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
        <div style={{ width: '100%', border: '1px solid var(--ua-border-default)', borderRadius: 'var(--ua-radius-card)' }}>
          <EmptyState title="No records yet" description="Records appear here once data arrives." />
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
        <div style={{ padding: 'var(--space-4)' }}>Drawer body content.</div>
      </Drawer>
    </div>
  );
}
