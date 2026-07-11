'use client';

import { PanelCard, StatusBadge, statusBadgeVariantFor } from '@/components/ui';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { RECOVERY_TYPE_LABELS } from '@/lib/partners/types';
import {
  RECOVERY_OWNER_LABELS,
  RECOVERY_STATUS_LABELS,
  type RecoveryCase,
} from '@/lib/recoveries/types';
import { RECOVERY_BOARD_COLUMNS } from '@/lib/recoveries/status';

type Props = {
  recoveries: RecoveryCase[];
};

function dateLabel(value: string | null) {
  if (!value) return 'No date';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RecoveryBoardClient({ recoveries }: Props) {
  return (
    <div>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
        Card status and evidence completeness update from connected source sync, matched correspondence, and provider status events.
      </p>
      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-5">
      {RECOVERY_BOARD_COLUMNS.map((column) => {
        const rows = recoveries.filter((item) => column.statuses.includes(item.status));
        return (
          <PanelCard
            as="section"
            variant="app"
            key={column.key}
            className="min-w-0 overflow-hidden p-0"
          >
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2" style={{ borderColor: 'var(--border-muted)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{column.label}</p>
              <StatusBadge variant="held" className="px-2 py-0.5 text-[11px] font-mono" dot={false}>
                {rows.length}
              </StatusBadge>
            </div>
            <div className="space-y-2 p-2">
              {rows.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  No cases
                </p>
              ) : rows.map((item) => {
                const orderLabel = item.support_payout_case?.order_number ?? item.support_payout_case?.ticket_external_id ?? item.support_payout_case_id.slice(0, 8);
                return (
                  <PanelCard
                    as="article"
                    key={item.id}
                    variant="appInset"
                    className="p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <a
                          href={`/recoveries/${item.id}`}
                          className="block truncate text-xs font-semibold no-underline hover:underline"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {orderLabel}
                        </a>
                        <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                          {RECOVERY_TYPE_LABELS[item.recovery_type]} · {RECOVERY_OWNER_LABELS[item.owner_type]}
                        </p>
                      </div>
                      <StatusBadge
                        variant={statusBadgeVariantFor(item.status)}
                        className="shrink-0 px-2 py-0.5 text-[11px]"
                      >
                        {RECOVERY_STATUS_LABELS[item.status]}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p style={{ color: 'var(--text-tertiary)' }}>Loss</p>
                        <p className="font-mono" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrencyNullable(item.merchant_loss_amount, item.currency) ?? '-'}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-tertiary)' }}>Recoverable</p>
                        <p className="font-mono" style={{ color: 'var(--text-primary)' }}>
                          {formatCurrencyNullable(item.estimated_recoverable_max, item.currency) ?? '-'}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-tertiary)' }}>Deadline</p>
                        <p style={{ color: 'var(--text-primary)' }}>{dateLabel(item.deadline_at)}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--text-tertiary)' }}>Last source update</p>
                        <p style={{ color: 'var(--text-primary)' }}>{dateLabel(item.updated_at)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <StatusBadge
                        variant={item.evidence_complete ? 'cleared' : 'flagged'}
                        className="px-2 py-0.5 text-[11px]"
                      >
                        {item.evidence_complete ? 'Evidence complete' : `${item.evidence_missing.length} evidence missing`}
                      </StatusBadge>
                      {item.partner?.name ? (
                        <StatusBadge variant="held" className="px-2 py-0.5 text-[11px]">
                          {item.partner.name}
                        </StatusBadge>
                      ) : null}
                    </div>
                  </PanelCard>
                );
              })}
            </div>
          </PanelCard>
        );
      })}
      </div>
    </div>
  );
}
