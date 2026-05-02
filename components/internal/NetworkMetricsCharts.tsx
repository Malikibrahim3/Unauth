'use client';

/**
 * components/internal/NetworkMetricsCharts.tsx
 *
 * Recharts-based charts for the internal network metrics dashboard.
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Snapshot {
  snapshot_date: string;
  total_identities: number;
  identities_at_3plus_merchants: number;
  audits_in_last_30d: number;
  audits_with_cross_merchant_signal_30d: number;
  active_merchants_30d: number;
  uploads_in_last_30d: number;
}

interface Props {
  snapshots: Snapshot[];
}

function shortDate(d: string) {
  return d.slice(5); // MM-DD
}

export default function NetworkMetricsCharts({ snapshots }: Props) {
  const signalData = snapshots.map((s) => ({
    date: shortDate(s.snapshot_date),
    pct:
      s.audits_in_last_30d > 0
        ? parseFloat(
            ((s.audits_with_cross_merchant_signal_30d / s.audits_in_last_30d) * 100).toFixed(1)
          )
        : 0,
  }));

  const sectionClass = 'rounded-lg border p-5 space-y-3';
  const sectionStyle = { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' };
  const titleClass = 'text-heading-sm';
  const subtitleClass = 'text-caption';

  return (
    <div className="space-y-6">
      {/* Section 1: Identity graph growth */}
      <div className={sectionClass} style={sectionStyle}>
        <div>
          <h2 className={titleClass} style={{ color: 'var(--text)' }}>
            Identity graph growth
          </h2>
          <p className={subtitleClass} style={{ color: 'var(--text-muted)' }}>
            k-anonymity threshold satisfied = identities at 3+ merchants
          </p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={snapshots.map((s) => ({ date: shortDate(s.snapshot_date), total: s.total_identities, kanon: s.identities_at_3plus_merchants }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" name="Total identities" stroke="var(--accent, #6366f1)" dot={false} />
            <Line type="monotone" dataKey="kanon" name="k-anon satisfied (3+)" stroke="var(--success, #22c55e)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Section 2: Network signal activation */}
      <div className={sectionClass} style={sectionStyle}>
        <div>
          <h2 className={titleClass} style={{ color: 'var(--text)' }}>
            Network signal activation
          </h2>
          <p className={subtitleClass} style={{ color: 'var(--text-muted)' }}>
            % of audits producing at least one cross-merchant signal
          </p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={signalData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis unit="%" tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Legend />
            <Line type="monotone" dataKey="pct" name="Audits with cross-merchant signal %" stroke="var(--warning, #f59e0b)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Section 3: Merchant engagement */}
      <div className={sectionClass} style={sectionStyle}>
        <div>
          <h2 className={titleClass} style={{ color: 'var(--text)' }}>
            Merchant engagement
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={snapshots.map((s) => ({ date: shortDate(s.snapshot_date), merchants: s.active_merchants_30d, uploads: s.uploads_in_last_30d }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="merchants" name="Active merchants (30d)" fill="var(--accent, #6366f1)" />
            <Bar dataKey="uploads" name="Uploads (30d)" fill="var(--info, #3b82f6)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
