'use client';

import { useEffect, useState } from 'react';

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
  return d.slice(5);
}

type RechartsModule = typeof import('recharts');

const SECTION_STYLE = { background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' };

export default function NetworkMetricsChartsClient({ snapshots }: Props) {
  const [recharts, setRecharts] = useState<RechartsModule | null>(null);

  useEffect(() => {
    void import('recharts').then(setRecharts);
  }, []);

  if (!recharts) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((key) => (
          <div
            key={key}
            className="h-[320px] w-full animate-pulse rounded-lg border"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  const {
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
  } = recharts;

  const signalData = snapshots.map((s) => ({
    date: shortDate(s.snapshot_date),
    pct:
      s.audits_in_last_30d > 0
        ? parseFloat(
            ((s.audits_with_cross_merchant_signal_30d / s.audits_in_last_30d) * 100).toFixed(1),
          )
        : 0,
  }));

  const sectionClass = 'rounded-lg border p-5 space-y-3';
  const titleClass = 'text-heading-sm';
  const subtitleClass = 'text-caption';

  return (
    <div className="space-y-6">
      <div className={sectionClass} style={SECTION_STYLE}>
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
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" name="Total identities" stroke="var(--accent, #7B2D26)" dot={false} />
            <Line type="monotone" dataKey="kanon" name="k-anon satisfied (3+)" stroke="var(--success, #2F6B43)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={sectionClass} style={SECTION_STYLE}>
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
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis unit="%" tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Legend />
            <Line type="monotone" dataKey="pct" name="Audits with cross-merchant signal %" stroke="var(--warning, #8B6A14)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={sectionClass} style={SECTION_STYLE}>
        <div>
          <h2 className={titleClass} style={{ color: 'var(--text)' }}>
            Merchant engagement
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={snapshots.map((s) => ({ date: shortDate(s.snapshot_date), merchants: s.active_merchants_30d, uploads: s.uploads_in_last_30d }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="merchants" name="Active merchants (30d)" fill="var(--accent, #7B2D26)" />
            <Bar dataKey="uploads" name="Uploads (30d)" fill="var(--info, #415A72)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
