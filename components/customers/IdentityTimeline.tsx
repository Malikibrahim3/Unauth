import type { IdentityTimelineEntry } from '@/app/api/customers/[id]/route';
import { IDENTITY_VARIANT_BADGE_STYLE } from '@/components/customers/identityTimelineStyles';
import { labelFor } from '@/lib/copy/labels';
import { formatDateMode } from '@/lib/utils/format';

const FIELD_LABELS: Record<IdentityTimelineEntry['field'], string> = {
  email: labelFor('email'),
  name: labelFor('name'),
  address: labelFor('address'),
  ip: labelFor('ip'),
  card_last4: labelFor('card_last4'),
};

interface IdentityTimelineProps {
  entries: IdentityTimelineEntry[];
}

export default function IdentityTimeline({ entries }: IdentityTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-body-sm italic" style={{ color: 'var(--text-secondary)' }}>No identity history available.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border bg-[var(--surface)]" style={{ borderColor: 'var(--border)', boxShadow: 'var(--shadow-1)' }}>
      <table className="w-full border-collapse" style={{ fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>First Seen</th>
            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>Field</th>
            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>Value</th>
            <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>Change type</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={`${entry.field}-${entry.date}-${entry.value}`}
              style={{
                borderBottom: '1px solid var(--border-muted)',
                borderLeft: entry.isVariant ? '2px solid var(--lime)' : '2px solid transparent',
                background: 'var(--surface)',
              }}
            >
              <td className="num" style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--data-date)' }}>{formatDateMode(entry.date, 'table')}</td>
              <td style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{FIELD_LABELS[entry.field]}</div>
              </td>
              <td style={{ padding: '12px 14px' }}>
                <div className="font-mono break-all" style={{ color: 'var(--data-id)' }}>{entry.value}</div>
                {entry.isVariant && (
                  <div className="mt-1">
                    <span style={IDENTITY_VARIANT_BADGE_STYLE}>
                      Updated
                    </span>
                  </div>
                )}
              </td>
              <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                {entry.isVariant ? 'Changed later' : 'First seen'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
