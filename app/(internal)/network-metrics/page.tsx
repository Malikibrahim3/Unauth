/**
 * app/(internal)/network-metrics/page.tsx
 *
 * INTERNAL ONLY — gated by is_internal=true on the merchant row.
 * Shows network-wide metrics charts from network_metrics_snapshots.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NetworkMetricsCharts from '@/components/internal/NetworkMetricsCharts';

interface Snapshot {
  snapshot_date: string;
  total_identities: number;
  identities_at_2_merchants: number;
  identities_at_3plus_merchants: number;
  total_cross_merchant_matches_lifetime: number;
  audits_in_last_30d: number;
  audits_with_cross_merchant_signal_30d: number;
  active_merchants_30d: number;
  uploads_in_last_30d: number;
  network_inr_claim_rate: number | null;
  network_refund_rate: number | null;
}

export default async function NetworkMetricsPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Gate: is_internal only
  const { data: merchant } = await supabase
    .from('merchants')
    .select('is_internal')
    .eq('user_id', user.id)
    .single();

  if (!merchant || !(merchant as unknown as { is_internal: boolean }).is_internal) {
    redirect('/dashboard');
  }

  // Fetch last 90 days of snapshots
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data: snapshots } = await supabase
    .from('network_metrics_snapshots' as any)
    .select('*')
    .gte('snapshot_date', ninetyDaysAgo)
    .order('snapshot_date', { ascending: true });

  const typedSnapshots = (snapshots ?? []) as unknown as Snapshot[];
  const latest = typedSnapshots[typedSnapshots.length - 1] ?? null;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
          Network Metrics
        </h1>
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Internal dashboard — last 90 days of daily snapshots.
        </p>
      </div>

      {/* Section 4: Current state stat cards */}
      {latest && (
        <div>
          <h2 className="text-heading-sm mb-3" style={{ color: 'var(--text)' }}>
            Current state (today)
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Total identities', value: latest.total_identities.toLocaleString() },
              { label: 'k-anon satisfied (3+)', value: latest.identities_at_3plus_merchants.toLocaleString() },
              { label: 'Active merchants (30d)', value: latest.active_merchants_30d.toLocaleString() },
              { label: 'Uploads (30d)', value: latest.uploads_in_last_30d.toLocaleString() },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border px-5 py-4"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </div>
                <div className="text-display-md font-mono" style={{ color: 'var(--text)' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {typedSnapshots.length === 0 ? (
        <div className="rounded-lg border p-8 text-center" style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}>
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>
            No snapshots yet. Run <code className="font-mono">npm run snapshot-metrics</code> to generate the first row.
          </p>
        </div>
      ) : (
        <NetworkMetricsCharts snapshots={typedSnapshots} />
      )}
    </div>
  );
}
