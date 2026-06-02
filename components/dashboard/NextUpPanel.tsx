import Link from 'next/link';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { formatClaimAge, getClaimSlaState } from '@/lib/claims/sla';

export type NextUpClaim = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  claimType: string;
  status: string;
  amountAtRisk: number | null;
  currency: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  missing_parcel: 'Missing parcel',
  damaged: 'Damaged item',
  wrong_item: 'Wrong item',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  other: 'Other',
};

interface NextUpPanelProps {
  claims: NextUpClaim[];
  inboxCount: number;
}

export default function NextUpPanel({ claims, inboxCount }: NextUpPanelProps) {
  return (
    <section className="border-b" style={{ borderColor: 'var(--border-default)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface-alt)' }}>
        <div>
          <h2 className="text-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Next up</h2>
          <p className="text-caption mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Priority claims and queue work requiring analyst attention
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inboxCount > 0 && (
            <Link href="/claims" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              {inboxCount} open {inboxCount === 1 ? 'claim' : 'claims'} →
            </Link>
          )}
          <Link href="/claims?sla=overdue&sort=age" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            Overdue claims →
          </Link>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="px-4 py-6">
          <p className="text-body-sm" style={{ color: 'var(--text)' }}>No open claims need immediate review.</p>
          <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>
            Check the inbox queue as new claims arrive from Shopify and your helpdesk.
          </p>
          <Link href="/claims" className="mt-3 inline-block text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            Open claims →
          </Link>
        </div>
      ) : (
        <div>
          {claims.map((claim) => {
            const sla = getClaimSlaState(claim);
            const slaTone =
              sla.state === 'overdue'
                ? { bg: 'var(--sev-definite-fill)', text: 'var(--sev-definite)' }
                : sla.state === 'approaching'
                  ? { bg: 'var(--sev-probable-fill)', text: 'var(--sev-probable)' }
                  : { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' };

            return (
              <Link
                key={claim.id}
                href={`/customers/${claim.customerId}/claims?claimId=${claim.id}`}
                className="grid grid-cols-1 gap-3 border-b px-4 py-3 transition-colors hover:bg-[var(--bg-hover)] md:grid-cols-[minmax(0,1.4fr)_auto_auto]"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                      {claim.customerName}
                    </p>
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: slaTone.bg, color: slaTone.text }}
                    >
                      {sla.label}
                    </span>
                  </div>
                  <p className="text-caption mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                    {CLAIM_TYPE_LABELS[claim.claimType] ?? claim.claimType}
                    {claim.customerEmail ? ` · ${claim.customerEmail}` : ''}
                  </p>
                  <p className="text-caption mt-1" style={{ color: 'var(--text-subtle)' }}>
                    {formatClaimAge(claim)} · Updated {claim.updatedAt ? new Date(claim.updatedAt).toLocaleDateString('en-US') : '—'}
                  </p>
                </div>
                <div className="self-center text-right">
                  <p className="text-body-sm font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
                    {formatCurrencyNullable(claim.amountAtRisk, claim.currency ?? undefined)}
                  </p>
                  <p className="text-caption" style={{ color: 'var(--text-muted)' }}>At risk</p>
                </div>
                <span className="self-center text-caption font-semibold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                  Review claim →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
