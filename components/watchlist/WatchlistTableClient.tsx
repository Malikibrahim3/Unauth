'use client';

import { useState } from 'react';
import ConfidenceGrade, { riskLevelToGrade } from '@/components/ConfidenceGrade';
import RemoveButton from '@/components/watchlist/RemoveButton';
import CustomerIntelligenceDrawer from '@/components/customers/CustomerIntelligenceDrawer';

interface WatchlistEntry {
  id: string;
  customer_profile_id: string | null;
  display_name: string | null;
  display_email: string | null;
  last_seen_risk: string | null;
  added_at: string;
}

interface WatchlistTableClientProps {
  rows: WatchlistEntry[];
}

export default function WatchlistTableClient({ rows }: WatchlistTableClientProps) {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  return (
    <>
      <div className="border rounded-lg overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
              <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Customer</th>
              <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Last risk</th>
              <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>Added</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr
                key={entry.id}
                className="border-b transition-colors"
                style={{ borderColor: 'var(--border-subtle)', cursor: entry.customer_profile_id ? 'pointer' : 'default' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
                onClick={() => {
                  if (entry.customer_profile_id) {
                    setSelectedProfileId(entry.customer_profile_id);
                  }
                }}
              >
                <td className="px-4 py-3">
                  <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {entry.display_name ?? '—'}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{entry.display_email ?? '—'}</div>
                </td>
                <td className="px-4 py-3">
                  {entry.last_seen_risk ? (
                    <ConfidenceGrade grade={riskLevelToGrade(entry.last_seen_risk)} size="sm" />
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Intl.DateTimeFormat('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(entry.added_at))}
                </td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <RemoveButton id={entry.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomerIntelligenceDrawer
        profileId={selectedProfileId}
        onClose={() => setSelectedProfileId(null)}
      />
    </>
  );
}
