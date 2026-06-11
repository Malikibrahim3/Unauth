/**
 * app/(public)/demo/page.tsx
 *
 * Public demo route — no authentication required.
 * Renders the merchant dashboard in read-only mode against the demo merchant's data.
 * Write operations are intercepted and replaced with a "Sign up" prompt.
 *
 * SECURITY: This page must NOT use the service-role key directly.
 * All demo data is fetched via /api/demo/runs which is a tightly-scoped server
 * helper that only exposes whitelisted synthetic fields for the demo merchant.
 */

import Link from 'next/link';
import { AnalyticsBarChart } from '@/components/analytics/AnalyticsBarChart';
import { AnalyticsDonutChart } from '@/components/analytics/AnalyticsDonutChart';
import { AnalyticsLineChart } from '@/components/analytics/AnalyticsLineChart';
import { SectionCard } from '@/components/ui';

const DEMO_MERCHANT_ID = process.env.NEXT_PUBLIC_DEMO_MERCHANT_ID;

interface DemoRun {
  id: string;
  filename: string;
  total_rows: number;
  flagged_count: number | null;
  status: string;
  created_at: string;
}

const EXPECTED_RUN_SIZES = [200, 1500, 5400];

function scenarioLabel(totalRows: number): string {
  if (totalRows === 200) return 'Sprint validation';
  if (totalRows === 1500) return 'Daily operations';
  if (totalRows === 5400) return 'Peak-season stress';
  return 'Synthetic audit run';
}

export const metadata = {
  title: 'Demo | Unauth — Refund Abuse Intelligence',
};

async function getDemoRuns(): Promise<DemoRun[]> {
  if (!DEMO_MERCHANT_ID) return [];
  // Use the internal demo API which scopes reads to the demo merchant only
  // and does NOT use service-role credentials in this public route.
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/demo/runs`, {
      cache: 'no-store',
      headers: { 'x-internal-demo': '1' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.runs ?? []) as DemoRun[];
  } catch {
    return [];
  }
}

export default async function DemoPage() {
  if (!DEMO_MERCHANT_ID) {
    return (
      <div className="min-h-screen px-6 py-20" style={{ background: 'var(--bg-canvas)' }}>
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight text-[var(--text)]">Unauth demo</h1>
            <p className="max-w-xl text-base leading-7 text-[var(--text-muted)]">
              Explore the public audit walkthrough, then create a workspace when you are ready to test your own CSV.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/audit-demo"
                className="inline-block rounded-md bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              >
                Open audit demo →
              </Link>
              <Link
                href="/login"
                className="inline-block rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-2.5 text-sm font-semibold text-[var(--text)]"
              >
                Create workspace
              </Link>
            </div>
          </div>

          <div className="rounded-md border p-5 shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'Likely identities', value: '32' },
                { label: 'Signal rate', value: '14.8%' },
                { label: 'Evidence-ready', value: '7' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{item.label}</p>
                  <p className="mt-1 text-[28px] font-semibold leading-none text-[var(--text)]">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SectionCard title="Pattern mix" description="Illustrative demo preview">
                <AnalyticsDonutChart
                  data={[
                    { label: 'Refund patterns', value: 48, color: 'var(--accent)' },
                    { label: 'Chargebacks', value: 20, color: 'var(--sev-probable, #C7762B)' },
                    { label: 'Repeat identities', value: 32, color: 'var(--sev-clear, #3E7A63)' },
                  ]}
                  height={180}
                />
              </SectionCard>
              <SectionCard title="Projected review load" description="How a seeded audit tends to ramp">
                <AnalyticsBarChart
                  data={[
                    { label: 'Week 1', value: 14, color: 'var(--surface-border)' },
                    { label: 'Week 2', value: 19, color: 'var(--surface-border)' },
                    { label: 'Week 3', value: 27, color: 'var(--accent)' },
                    { label: 'Week 4', value: 32, color: 'var(--accent)' },
                  ]}
                  height={180}
                />
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const typedRuns = await getDemoRuns();
  const totalTransactions = typedRuns.reduce((sum, r) => sum + r.total_rows, 0);
  const totalFlagged = typedRuns.reduce((sum, r) => sum + (r.flagged_count ?? 0), 0);
  const runSizes = new Set(typedRuns.map((run) => run.total_rows));
  const seededScenarioCount = EXPECTED_RUN_SIZES.filter((size) => runSizes.has(size)).length;
  const trendData = typedRuns
    .slice()
    .reverse()
    .map((run) => ({
      label: new Date(run.created_at).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      value: run.total_rows > 0 ? Number((((run.flagged_count ?? 0) / run.total_rows) * 100).toFixed(1)) : 0,
    }));
  const scenarioBars = typedRuns
    .slice(0, 4)
    .map((run) => ({
      label: scenarioLabel(run.total_rows),
      value: run.flagged_count ?? 0,
      color: 'var(--accent)',
    }));
  const runStateDonut = [
    { label: 'Seeded scenarios', value: seededScenarioCount, color: 'var(--accent)' },
    { label: 'Unseeded / other', value: Math.max(typedRuns.length - seededScenarioCount, 0), color: 'var(--surface-border)' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* Permanent demo banner - non-dismissable */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-[var(--warning-bg)] px-6 py-2.5">
        <p className="text-sm font-semibold text-[var(--warning)]">
          You&rsquo;re viewing the Unauth demo on synthetic data. Sign up free to use it with your
          own CSV.
        </p>
        <Link
          href="/login"
          className="flex-shrink-0 rounded bg-[var(--warning)] px-4 py-1.5 text-xs font-bold text-[var(--text-inverse)] hover:bg-[var(--risk-high)] transition-colors"
        >
          Sign up →
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Demo Merchant - Audit Runs</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
              Synthetic ASOS-style order history only. Every identity, chargeback, and evidence
              package on this page is fictional and reset nightly.
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Start with your own data →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Audit Runs', value: typedRuns.length.toLocaleString() },
            { label: 'Seeded Scenarios', value: `${seededScenarioCount}/3` },
            { label: 'Transactions Analysed', value: totalTransactions.toLocaleString() },
            { label: 'Review Matches', value: totalFlagged.toLocaleString() },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">
                {label}
              </div>
              <div className="text-2xl font-mono font-bold text-[var(--text)]">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <SectionCard
            title="Review signal trend"
            description="Flagged-row rate across recent demo runs"
          >
            <AnalyticsLineChart
              data={trendData}
              height={220}
              valueFormatter={(n) => `${n.toFixed(1)}%`}
              seriesName="Flag rate"
              emptyLabel="No seeded runs yet"
            />
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <SectionCard
              title="Scenario coverage"
              description="How much of the demo is ready to explore"
            >
              <AnalyticsDonutChart
                data={runStateDonut}
                height={220}
                showLegend
                emptyLabel="No scenario data"
              />
            </SectionCard>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              rows: 200,
              title: 'Sprint validation',
              body: 'A compact run with obvious refund abuse, household traps, and one dispute-ready customer.',
            },
            {
              rows: 1500,
              title: 'Daily operations',
              body: 'A more realistic weekday mix with repeat buyers, refund-heavy rings, and at least one evidence-ready chargeback.',
            },
            {
              rows: 5400,
              title: 'Peak-season stress',
              body: 'A scaled synthetic run built to feel like a fashion merchant during promo-heavy periods.',
            },
          ].map((scenario) => {
            const seeded = runSizes.has(scenario.rows);
            return (
              <div
                key={scenario.rows}
                className="rounded-md border p-5"
                style={{
                  backgroundColor: seeded ? 'var(--bg-surface)' : 'var(--bg-inset)',
                  borderColor: seeded ? 'var(--border)' : 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-[var(--text)]">{scenario.title}</h2>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: seeded ? 'var(--success-bg)' : 'var(--bg-subtle)',
                      color: seeded ? 'var(--success)' : 'var(--text-muted)',
                    }}
                  >
                    {seeded ? 'Seeded' : 'Pending'}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">{scenario.rows.toLocaleString()} rows</p>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{scenario.body}</p>
              </div>
            );
          })}
        </div>

        <SectionCard
          title="Where the review volume sits"
          description="Flagged identities by recent scenario"
        >
          <AnalyticsBarChart
            data={scenarioBars}
            height={240}
            valueFormatter={(n) => n.toLocaleString()}
            emptyLabel="No review data yet"
          />
        </SectionCard>

        {/* Audit runs table */}
        <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <span className="font-semibold text-[var(--text)]">Audit Runs</span>
            <span className="text-xs text-[var(--text-muted)]">Nightly reset on staging</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-inset)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Scenario</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Filename</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Rows</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Review Matches</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Date</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {typedRuns.map((run) => (
                <tr key={run.id} className="border-b border-[var(--border-subtle)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--text)]">{scenarioLabel(run.total_rows)}</div>
                    <div className="text-xs text-[var(--text-muted)]">Synthetic evidence-ready dataset</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-muted)] max-w-xs truncate">
                    {run.filename}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text)]">
                    {run.total_rows.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text)]">
                    {(run.flagged_count ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {new Date(run.created_at).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: run.status === 'completed' ? 'var(--info-bg)' : 'var(--bg-subtle)',
                        color: run.status === 'completed' ? 'var(--info)' : 'var(--text-muted)',
                      }}
                    >
                      {run.status === 'completed' ? 'Read-only snapshot' : run.status}
                    </span>
                  </td>
                </tr>
              ))}
              {typedRuns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--text-subtle)]">
                    Demo data is being seeded - check back shortly.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="rounded-md border border-[var(--info-bd)] bg-[var(--info-bg)] p-6 flex items-center justify-between gap-6">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)] text-lg">Ready to run it on your data?</h2>
            <p className="mt-1 text-sm text-[var(--info)]">
              Upload your order CSV and get a full refund-abuse audit in minutes. Free to start.
            </p>
          </div>
          <Link
            href="/login"
            className="flex-shrink-0 rounded-md bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Create free account →
          </Link>
        </div>

        <div className="flex gap-4 text-xs text-[var(--text-subtle)]">
          <Link href="/legal/privacy" className="hover:underline">Privacy</Link>
          <Link href="/legal/data-handling" className="hover:underline">Data handling</Link>
          <Link href="/legal/dpa" className="hover:underline">DPA</Link>
        </div>
      </div>
    </div>
  );
}
