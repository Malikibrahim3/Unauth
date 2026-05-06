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
          <h1 className="text-2xl font-bold text-gray-900">Demo coming soon</h1>
          <p className="text-gray-600">
            The interactive demo is being set up. Check back shortly.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f8f8' }}>
      {/* Permanent demo banner — non-dismissable */}
      <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-400 px-6 py-2.5">
        <p className="text-sm font-semibold text-amber-900">
          You&rsquo;re viewing the Unauth demo on synthetic data. Sign up free to use it with your
          own CSV.
        </p>
        <Link
          href="/login"
          className="flex-shrink-0 rounded bg-amber-900 px-4 py-1.5 text-xs font-bold text-amber-50 hover:bg-amber-800 transition-colors"
        >
          Sign up →
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demo Merchant — Audit Runs</h1>
            <p className="mt-1 text-sm text-gray-500">
              Synthetic data only. All identities are fictional.
            </p>
          </div>
          <Link
            href="/login"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Start with your own data →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Audit Runs', value: typedRuns.length.toLocaleString() },
            { label: 'Transactions Analysed', value: totalTransactions.toLocaleString() },
            { label: 'Matched', value: totalFlagged.toLocaleString() },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg border border-gray-200 bg-white px-5 py-4"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">
                {label}
              </div>
              <div className="text-2xl font-mono font-bold text-gray-900">{value}</div>
            </div>
          ))}
        </div>

        {/* Audit runs table */}
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <span className="font-semibold text-gray-900">Audit Runs</span>
            <span className="text-xs text-gray-500">{typedRuns.length} total (demo)</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Filename</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Rows</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Matched</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {typedRuns.map((run) => (
                <tr key={run.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-xs truncate">
                    {run.filename}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">
                    {run.total_rows.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">
                    {(run.flagged_count ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(run.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {run.status === 'completed' ? (
                      <Link
                        href={`/demo/audit/${run.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        View →
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-400">{run.status}</span>
                    )}
                  </td>
                </tr>
              ))}
              {typedRuns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                    Demo data is being seeded — check back shortly.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-6 flex items-center justify-between gap-6">
          <div>
            <h2 className="font-semibold text-indigo-900 text-lg">Ready to run it on your data?</h2>
            <p className="mt-1 text-sm text-indigo-700">
              Upload your order CSV and get a full refund-abuse audit in minutes. Free to start.
            </p>
          </div>
          <Link
            href="/login"
            className="flex-shrink-0 rounded-md bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            Create free account →
          </Link>
        </div>

        <div className="flex gap-4 text-xs text-gray-400">
          <Link href="/legal/privacy" className="hover:underline">Privacy</Link>
          <Link href="/legal/data-handling" className="hover:underline">Data handling</Link>
          <Link href="/legal/dpa" className="hover:underline">DPA</Link>
        </div>
      </div>
    </div>
  );
}
