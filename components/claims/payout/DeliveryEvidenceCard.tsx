'use client';

import type { ClaimDecisionContext } from '@/lib/claims/decision/types';
import { formatDeliveryEvidenceLine } from '@/lib/integrations/trackingEvidenceSlice';

export function DeliveryEvidenceCard({
  delivery,
}: {
  delivery: ClaimDecisionContext['delivery'];
}) {
  const line = formatDeliveryEvidenceLine(delivery);
  if (!delivery) return null;

  return (
    <section
      className="rounded-md p-4 border"
      style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
    >
      <p className="text-caption font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
        Delivery evidence
      </p>
      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        {line}
      </p>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <Detail label="Carrier" value={delivery.carrier ?? '—'} />
        <Detail label="Tracking number" value={delivery.trackingNumber ?? '—'} />
        <Detail label="Status" value={delivery.status?.replace(/_/g, ' ') ?? '—'} />
        <Detail label="Last scan" value={formatDate(delivery.lastScanAt)} />
        <Detail label="Delivered" value={formatDate(delivery.deliveredAt)} />
        <Detail
          label="Exceptions"
          value={delivery.exceptionCount > 0 ? `${delivery.exceptionCount} event(s)` : 'None'}
        />
      </dl>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
        <CapabilityPill
          label="Delivery photo"
          state={delivery.deliveryPhotoAvailable ? 'present' : delivery.afterShipConnected ? 'unavailable' : 'unknown'}
        />
        <CapabilityPill
          label="Signature"
          state={delivery.signatureAvailable ? 'present' : delivery.afterShipConnected ? 'unavailable' : 'unknown'}
        />
        <CapabilityPill
          label="GPS"
          state={delivery.gpsSupported ? 'present' : delivery.trackingProviderConnected ? 'unsupported' : 'unknown'}
        />
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ color: 'var(--text-tertiary)' }}>{label}</dt>
      <dd className="font-medium" style={{ color: 'var(--text-secondary)' }}>{value}</dd>
    </div>
  );
}

function CapabilityPill({
  label,
  state,
}: {
  label: string;
  state: 'present' | 'unavailable' | 'unsupported' | 'unknown';
}) {
  const copy =
    state === 'present'
      ? `${label}: on file`
      : state === 'unavailable'
        ? `${label}: not provided by this provider`
        : state === 'unsupported'
          ? `${label}: unsupported`
          : `${label}: not tracked`;
  return (
    <span className="rounded-full border px-2 py-0.5" style={{ borderColor: 'var(--border-muted)' }}>
      {copy}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
