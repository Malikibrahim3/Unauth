'use client';

import dynamic from 'next/dynamic';

const NetworkMetricsChartsClient = dynamic(() => import('./NetworkMetricsChartsClient'), {
  ssr: false,
  loading: () => (
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
  ),
});

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

export default function NetworkMetricsCharts({ snapshots }: Props) {
  return <NetworkMetricsChartsClient snapshots={snapshots} />;
}
