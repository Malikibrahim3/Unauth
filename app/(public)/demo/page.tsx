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
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-[var(--text)]">Demo coming soon</h1>
          <p className="text-[var(--text-muted)]">
            The interactive demo is being set up. Check back shortly.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            Sign up free →
          </Link>
        </div>
      </div>
    );
  }

  const typedRuns = await getDemoRuns();
  const totalTransactions = typedRuns.reduce((sum, r) => sum + r.total_rows, 0);
  const totalFlagged = typedRuns.reduce((sum, r) => sum + (r.flagged_count ?? 0), 0);
  const runSizes = new Set(typedRuns.map((run) => run.total_rows));
  const seededScenarioCount = EXPECTED_RUN_SIZES.filter((size) => runSizes.has(size)).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      {/* Permanent demo banner — non-dismissable */}
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
            <h1 className="text-2xl font-bold text-[var(--text)]">Demo Merchant — Audit Runs</h1>
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
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] mb-1">
                {label}
              </div>
              <div className="text-2xl font-mono font-bold text-[var(--text)]">{value}</div>
            </div>
          ))}
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
                className="rounded-xl border px-5 py-5"
                style={{
                  backgroundColor: seeded ? 'var(--bg-surface)' : 'var(--bg-inset)',
                  borderColor: seeded ? 'var(--border)' : 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-[var(--text)]">{scenario.title}</h2>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
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

        {/* Audit runs table */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
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
                    {new Date(run.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
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
                    Demo data is being seeded — check back shortly.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-[var(--info-bd)] bg-[var(--info-bg)] px-6 py-6 flex items-center justify-between gap-6">
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
