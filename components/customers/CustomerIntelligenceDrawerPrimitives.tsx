'use client';

import type { ComponentType, ReactNode } from 'react';

export function DrawerSkeleton() {
  return (
    <div className="animate-pulse p-5 space-y-4">
      <div className="cid-skeleton-bar" style={{ height: 20, width: '55%' }} />
      <div className="cid-skeleton-bar" style={{ height: 14, width: '35%' }} />
      <div className="grid grid-cols-3 gap-2 mt-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="cid-skeleton-cell" />
        ))}
      </div>
      <div className="space-y-3 mt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="cid-skeleton-block" />
        ))}
      </div>
    </div>
  );
}

export function Section({ title, children, count }: { title: string; children: ReactNode; count?: number }) {
  return (
    <div className="cid-section">
      <div className="flex items-center justify-between mb-3">
        <div className="cid-overline">
          <span aria-hidden="true" className="ua-section-dot" />
          {title}
        </div>
        {count != null && <span className="cid-chip cid-chip-muted">{count}</span>}
      </div>
      {children}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="cid-stat-tile">
      <p className="cid-overline" style={{ marginBottom: 4 }}>
        {label}
      </p>
      <p className="cid-stat-value">{value}</p>
      {hint ? <p className="cid-stat-hint">{hint}</p> : null}
    </div>
  );
}

export function DetailLine({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="flex items-start gap-2 min-w-0">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 cid-icon-subtle" />
      <div className="min-w-0">
        <p className="cid-detail-label">{label}</p>
        <p className={`cid-detail-value${mono ? ' cid-detail-value-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}
