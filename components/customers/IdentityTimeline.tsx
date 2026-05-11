import type { IdentityTimelineEntry } from '@/app/api/customers/[id]/route';
import { labelFor } from '@/lib/copy/labels';

const FIELD_LABELS: Record<IdentityTimelineEntry['field'], string> = {
  email: labelFor('email'),
  name: labelFor('name'),
  address: labelFor('address'),
  ip: labelFor('ip'),
  card_last4: labelFor('card_last4'),
};

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

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
    <ol className="relative space-y-0" style={{ borderLeft: '1px solid var(--border-subtle)' }}>
      {entries.map((entry, idx) => (
        <li key={idx} className="ml-4 pb-4 last:pb-0">
          {/* Timeline dot */}
          <span
            className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full"
            style={{
              background: entry.isVariant ? 'var(--risk-high)' : 'var(--icon-muted)',
              border: '2px solid var(--bg-surface)',
            }}
          />

          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs mb-0.5" style={{ color: 'var(--text-subtle)' }}>{formatDate(entry.date)}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {FIELD_LABELS[entry.field]}
                </span>
                {entry.isVariant && (
                  <span
                    title="Different from the first-seen value for this field"
                    className="text-sm leading-none"
                    style={{ color: 'var(--risk-high)' }}
                    aria-label="Variant value"
                  >
                    ⚠
                  </span>
                )}
              </div>
              <p className="text-sm font-mono break-all" style={{ color: 'var(--text)' }}>{entry.value}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
