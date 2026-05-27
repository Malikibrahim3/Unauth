import type { IdentityTimelineEntry } from '@/app/api/customers/[id]/route';
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
      <p className="text-body-sm italic" style={{ color: 'var(--ink-secondary)' }}>No identity history available.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--surface-base)', borderBottom: '1px solid var(--surface-border)' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--ink-secondary)' }}>First Seen</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--ink-secondary)' }}>Field</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--ink-secondary)' }}>Value</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--ink-secondary)' }}>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={idx}
              style={{
                borderBottom: '1px solid var(--surface-border)',
                borderLeft: entry.isVariant ? '2px solid var(--sev-probable)' : '2px solid transparent',
                background: entry.isVariant ? 'var(--sev-probable-fill)' : 'var(--surface-raised)',
              }}
            >
              <td className="num" style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: 'var(--data-date)' }}>{formatDateMode(entry.date, 'table')}</td>
              <td style={{ padding: '10px' }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.01em', color: 'var(--ink-secondary)' }}>{FIELD_LABELS[entry.field]}</div>
              </td>
              <td style={{ padding: '10px' }}>
                <div className="font-mono break-all" style={{ color: 'var(--data-id)' }}>{entry.value}</div>
                {entry.isVariant && (
                  <div className="mt-1">
                    <span style={{ display: 'inline-flex', height: 18, alignItems: 'center', padding: '0 7px', borderRadius: 3, background: 'var(--sev-probable-fill)', color: 'var(--sev-probable)', border: '1px solid color-mix(in srgb, var(--sev-probable) 40%, transparent)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      ▲ Variant
                    </span>
                  </div>
                )}
              </td>
              <td className="num" style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: 'var(--data-date)' }}>{formatDateMode(entry.date, 'table')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
