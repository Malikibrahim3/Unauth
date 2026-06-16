import type { ComponentType, CSSProperties, ReactNode } from 'react';
import {
  AlertTriangle,
  CreditCard,
  GitBranch,
  Mail,
  MapPin,
  ReceiptText,
  RotateCcw,
  UserRound,
} from 'lucide-react';
import { labelFor } from '@/lib/copy/labels';
import { formatCurrencyNullable, formatDate } from '@/lib/utils/format';
import { GradeBadge, type ConfidenceGradeValue } from '@/components/ui/GradeBadge';
import { Badge } from '@/components/ui/Badge';
import { labelize, type RoadmapTransaction } from '@/app/(app)/customers/[id]/customerProfilePageLabels';

function TimelineDetail({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="min-w-0 rounded-md border p-3" style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      </div>
      <p className={`mt-1 text-body-sm break-words ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  );
}

export function IdentityDatum({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</dt>
      <dd className="space-y-1">{children}</dd>
    </div>
  );
}

function roadmapTitle(tx: RoadmapTransaction) {
  if (tx.chargeback_filed) return 'Chargeback filed';
  if (tx.refund_claimed) return 'Refund claim recorded';
  return 'Order placed';
}

export function ConfidencePill({ grade }: { grade: string }) {
  return (
    <GradeBadge
      grade={grade as ConfidenceGradeValue}
      size="sm"
      showLabel={true}
      compact={true}
    />
  );
}

const SOURCE_LABELS: Record<string, string> = {
  csv: 'CSV',
  shopify: 'Shopify',
  zendesk: 'Zendesk',
  gorgias: 'Gorgias',
  api: 'API',
};

export function RoadmapOrderCard({ tx, isLast }: { tx: RoadmapTransaction; isLast: boolean }) {
  const hasClaim = !!(tx.refund_claimed ?? tx.chargeback_filed);
  const eventDate = tx.processed_at;
  const flags = Array.isArray(tx.fraud_flags) ? tx.fraud_flags : [];

  return (
    <li className="relative pl-10 pb-5 last:pb-0">
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[13px] top-8 bottom-0 w-px"
          style={{ background: 'var(--border-muted)' }}
        />
      )}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full border"
        style={{
          background: hasClaim ? 'var(--risk-high-bg)' : 'var(--surface)',
          borderColor: hasClaim ? 'var(--risk-high-bd)' : 'var(--border)',
          color: hasClaim ? 'var(--risk-high)' : 'var(--text-secondary)',
        }}
      >
        {tx.chargeback_filed ? <AlertTriangle className="h-4 w-4" /> : hasClaim ? <RotateCcw className="h-4 w-4" /> : <ReceiptText className="h-4 w-4" />}
      </span>

      <article className="rounded-md border bg-[var(--surface)]" style={{ borderColor: 'var(--border-muted)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border-muted)' }}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-h2" style={{ color: 'var(--text-primary)' }}>{roadmapTitle(tx)}</h3>
              {tx.source && (
                <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}>
                  {SOURCE_LABELS[tx.source] ?? tx.source}
                </span>
              )}
              {tx.via_email && (
                <span
                  className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
                  title="This order came from a linked account resolved to the same identity"
                >
                  via {tx.via_email}
                </span>
              )}
            </div>
            <p className="mt-1 text-caption font-mono" style={{ color: 'var(--text-secondary)' }}>{tx.order_id}</p>
          </div>
          <div className="text-right">
            <p className="text-body-strong num" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(Number(tx.order_value) || null)}</p>
            <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>{formatDate(eventDate)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
          <TimelineDetail icon={Mail} label="Email used" value={tx.customer_email} mono />
          <TimelineDetail icon={UserRound} label="Name used" value={tx.customer_name} />
          <TimelineDetail icon={MapPin} label="Shipping address" value={tx.shipping_address} />
          <TimelineDetail icon={CreditCard} label={labelFor('card')} value={tx.card_last4 ? `•••• ${tx.card_last4}` : null} mono />
          <TimelineDetail icon={GitBranch} label={labelFor('device_ip')} value={tx.device_ip} mono />
          <TimelineDetail icon={ReceiptText} label="Processed timestamp" value={formatDate(tx.processed_at)} />
        </div>

        {(tx.refund_claimed ?? tx.chargeback_filed) && (
          <div className="mx-4 mb-4 rounded-md border p-3" style={{ borderColor: 'var(--risk-high-bd)', background: 'var(--risk-high-bg)' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-caption" style={{ color: 'var(--risk-high)' }}>Claim status</p>
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {tx.chargeback_filed ? 'Chargeback filed' : 'Refund claimed'}
                </p>
              </div>
              <div>
                <p className="text-caption" style={{ color: 'var(--risk-high)' }}>Timestamp</p>
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {formatDate(tx.chargeback_date ?? tx.processed_at)}
                </p>
              </div>
              <div>
                <p className="text-caption" style={{ color: 'var(--risk-high)' }}>Reason</p>
                <p className="text-body-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {tx.refund_reason || tx.chargeback_reason_code || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        )}

        {flags.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {flags.map((flag: string) => (
              <Badge key={flag} tone="neutral" variant="subtle" size="sm">{labelize(flag)}</Badge>
            ))}
          </div>
        )}
      </article>
    </li>
  );
}
