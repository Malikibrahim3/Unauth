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
      <p className="text-body-sm italic" style={{ color: 'var(--text-muted)' }}>No identity history available.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-default)' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>First Seen</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Field</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Value</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={idx}
              style={{
                borderBottom: '1px solid var(--border-default)',
                borderLeft: entry.isVariant ? '2px solid #7B2D26' : '2px solid transparent',
                background: entry.isVariant ? 'var(--bg-canvas)' : '#FFFFFF',
              }}
            >
              <td className="num" style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#4A4640' }}>{formatDateMode(entry.date, 'table')}</td>
              <td style={{ padding: '10px' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{FIELD_LABELS[entry.field]}</div>
              </td>
              <td style={{ padding: '10px' }}>
                <div className="font-mono break-all" style={{ color: '#1A1814' }}>{entry.value}</div>
                {entry.isVariant && (
                  <div className="mt-1">
                    <span style={{ display: 'inline-flex', height: 18, alignItems: 'center', padding: '0 7px', borderRadius: 3, background: '#FBEFEC', color: '#7B2D26', border: '1px solid #F0C8BE', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      ▲ Variant
                    </span>
                  </div>
                )}
              </td>
              <td className="num" style={{ padding: '10px', fontFamily: 'var(--font-mono)', color: '#4A4640' }}>{formatDateMode(entry.date, 'table')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
