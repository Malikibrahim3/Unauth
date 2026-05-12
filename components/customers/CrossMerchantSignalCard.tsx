'use client';

/**
 * Phase E-2 — CrossMerchantSignalCard
 *
 * Feature-flagged by FLAG_CROSS_MERCHANT_SIGNALS (default-off).
 *
 * Displays a compact card distinguishing signals seen:
 *   - "On your store" — from this merchant's own transactions
 *   - "Across the network" — from fraud_entities + fraud_entity_co_occurrences
 *
 * READ-ONLY. No writes to any entity table. No modifications to frozen-core files.
 * Data is fetched from /api/customers/[id]/cross-merchant endpoint.
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { SignalType } from '@/components/ui/SignalBadge';
import { SectionCard } from '@/components/ui/SectionCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrossMerchantSignalData {
  yourStore: {
    signalType: SignalType;
    label: string;
    count: number; // occurrences on this merchant
  }[];
  network: {
    signalType: SignalType;
    label: string;
    merchantCount: number; // distinct merchants flagging this entity
    totalOccurrences: number;
  }[];
  networkEntityCount: number; // total distinct co-occurring entity records
}

interface CrossMerchantSignalCardProps {
  profileId: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Signal type human labels
// ---------------------------------------------------------------------------

const SIGNAL_LABEL: Partial<Record<SignalType, string>> = {
  shared_email:    'Shared email',
  shared_phone:    'Shared phone',
  shared_address:  'Shared address',
  shared_card:     'Shared card',
  shared_ip:       'Shared IP address',
  shared_device:   'Shared device',
  shared_account_id: 'Shared account ID',
};

function sigLabel(type: SignalType): string {
  return SIGNAL_LABEL[type] ?? type.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function CrossMerchantSkeleton() {
  return (
    <div className="space-y-[var(--space-2)] animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-8 rounded" style={{ background: 'var(--bg-surface-sunk)' }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signal row
// ---------------------------------------------------------------------------

interface SignalRowProps {
  label: string;
  scope: 'store' | 'network';
  detail: string;
}

function SignalRow({ label, scope, detail }: SignalRowProps) {
  return (
    <div className="flex items-start justify-between gap-[var(--space-3)] py-[var(--space-2)] border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="flex items-center gap-[var(--space-2)]">
        <span
          className="inline-flex items-center rounded-[var(--radius-pill)] px-[var(--space-2)] py-px text-meta font-medium"
          style={
            scope === 'network'
              ? { background: 'var(--risk-medium-bg)', color: 'var(--risk-medium-fg)' }
              : { background: 'var(--accent-100)', color: 'var(--accent-600)' }
          }
        >
          {scope === 'network' ? 'Network' : 'Your store'}
        </span>
        <span className="text-small text-[var(--text-primary)]">{label}</span>
      </div>
      <span className="text-small text-[var(--text-tertiary)] shrink-0">{detail}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CrossMerchantSignalCard({ profileId, className }: CrossMerchantSignalCardProps) {
  const [data, setData] = useState<CrossMerchantSignalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/customers/${encodeURIComponent(profileId)}/cross-merchant`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<CrossMerchantSignalData>;
      })
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e: Error) => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [profileId]);

  const hasAny = data && (data.yourStore.length > 0 || data.network.length > 0);

  return (
    <SectionCard
      title="Signal scope"
      description="Where these signals have been seen"
      className={cn(className)}
    >
      {loading && <CrossMerchantSkeleton />}

      {!loading && error && (
        <p className="text-small text-[var(--text-tertiary)]">
          Could not load network signals.
        </p>
      )}

      {!loading && !error && !hasAny && (
        <p className="text-small text-[var(--text-tertiary)]">
          No cross-merchant signal data available for this customer.
        </p>
      )}

      {!loading && !error && hasAny && (
        <div>
          {data.yourStore.map((s) => (
            <SignalRow
              key={`store-${s.signalType}`}
              scope="store"
              label={sigLabel(s.signalType)}
              detail={`${s.count} time${s.count !== 1 ? 's' : ''} on your store`}
            />
          ))}
          {data.network.map((s) => (
            <SignalRow
              key={`net-${s.signalType}`}
              scope="network"
              label={sigLabel(s.signalType)}
              detail={`${s.merchantCount} merchant${s.merchantCount !== 1 ? 's' : ''} · ${s.totalOccurrences} total`}
            />
          ))}
          {data.networkEntityCount > 0 && (
            <p className="text-meta text-[var(--text-tertiary)] mt-[var(--space-3)]">
              {data.networkEntityCount} co-occurring network entity record
              {data.networkEntityCount !== 1 ? 's' : ''}.
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
