'use client';

import type { DrawerProfile } from '@/components/customers/customerIntelligenceDrawerUtils';
import type { LinkedAccount } from '@/app/api/customers/[id]/route';

export function CustomerIntelligenceDrawerCaseCard({
  profile,
  linkedAccounts,
  claimCount,
  variantCount,
  displayName,
}: {
  profile: DrawerProfile;
  linkedAccounts: LinkedAccount[];
  claimCount: number;
  variantCount: number;
  displayName: string;
}) {
  void linkedAccounts;
  void variantCount;
  const summary =
    claimCount > 0
      ? `${claimCount} payout ${claimCount === 1 ? 'case' : 'cases'} on record for this customer context.`
      : 'No payout cases are linked to this customer context yet.';

  const stats = [
    { label: 'ORDERS', value: profile.total_orders, hot: false },
    { label: 'CASES', value: claimCount || profile.total_refund_claims, hot: (claimCount || profile.total_refund_claims) > 1 },
    { label: 'CHARGE.', value: profile.total_chargebacks, hot: profile.total_chargebacks > 1 },
    { label: 'REFUNDS', value: profile.total_refund_claims, hot: profile.total_refund_claims > 1 },
  ];

  return (
    <div className="cid-case-card">
      <div className="cid-case-bar">
        <div className="flex items-center gap-2">
          <span className="cid-grade-dot" style={{ background: 'var(--accent)' }} aria-hidden="true" />
          <span className="cid-overline">Customer context</span>
        </div>
      </div>
      <div className="cid-subject-block">
        <div className="cid-overline" style={{ marginBottom: 4 }}>
          Subject
        </div>
        <p className="cid-subject-name">{displayName}</p>
        {profile.primary_email && profile.names[0] ? (
          <p className="cid-subject-email">{profile.primary_email}</p>
        ) : null}
      </div>
      <div className="cid-stats-grid">
        {stats.map(({ label, value, hot }) => (
          <div key={label} className="cid-stat-cell">
            <div className="cid-overline" style={{ marginBottom: 3 }}>
              {label}
            </div>
            <div className={hot ? 'cid-stat-cell-value cid-stat-cell-value--hot' : 'cid-stat-cell-value cid-stat-cell-value--normal'}>
              {value}
            </div>
          </div>
        ))}
      </div>
      <div className="cid-signal-strip">
        <div className="min-w-0 flex-1">
          <div className="cid-overline" style={{ marginBottom: 1 }}>
            Payout summary
          </div>
          <p className="cid-detail-label">{summary}</p>
        </div>
      </div>
    </div>
  );
}
