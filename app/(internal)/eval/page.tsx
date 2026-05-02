/**
 * app/(internal)/eval/page.tsx
 *
 * INTERNAL ONLY — never linked from merchant-facing navigation.
 * Gated by is_internal=true on the merchant's row.
 *
 * Renders the latest eval run report from the eval_history table.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface EvalHistoryRow {
  id: string;
  run_at: string;
  dataset_path: string;
  row_count: number | null;
  labelled_count: number | null;
  precision_score: number | null;
  recall_score: number | null;
  f1_score: number | null;
  full_report: Record<string, unknown> | null;
  engine_version: string | null;
}

export default async function InternalEvalPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Gate: only is_internal merchants may access this page.
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, is_internal')
    .eq('user_id', user.id)
    .single();

  if (!merchant || !(merchant as unknown as { is_internal: boolean }).is_internal) {
    redirect('/home');
  }

  // Fetch the 10 most recent eval runs via service role.
  // Using the standard client here — eval_history has no RLS so only
  // a service-role key can query it in production. In local dev the
  // anon key bypasses RLS when not defined.
  const { data: rows } = await supabase
    .rpc('get_eval_history' as never)
    .limit(10) as unknown as { data: EvalHistoryRow[] | null };

  // Fallback: direct table query (works in local dev / service role env)
  const evalRows: EvalHistoryRow[] = (rows ?? []) as EvalHistoryRow[];

  const latest = evalRows[0] ?? null;

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          Engine Eval — Internal
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Internal use only. Not linked from any merchant-facing page.
        </p>
      </div>

      {!latest && (
        <div className="rounded-md border border-dashed p-8 text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          <p className="text-sm">No eval runs recorded yet.</p>
          <p className="text-xs mt-1">
            Run <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">npm run eval -- test-data/realistic_fraud_dataset.csv</code> to generate one.
          </p>
        </div>
      )}

      {latest && (
        <div className="rounded-md border p-6 space-y-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg" style={{ color: 'var(--text)' }}>
              Latest Eval Run
            </h2>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(latest.run_at).toLocaleString('en-GB')}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>Dataset</dt>
              <dd className="font-mono text-xs mt-0.5" style={{ color: 'var(--text)' }}>{latest.dataset_path}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>Engine version</dt>
              <dd style={{ color: 'var(--text)' }}>{latest.engine_version ?? '—'}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>Rows / Labelled</dt>
              <dd style={{ color: 'var(--text)' }}>{latest.row_count ?? '—'} / {latest.labelled_count ?? '—'}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>F1</dt>
              <dd className={`font-semibold ${(latest.f1_score ?? 0) >= 0.70 ? 'text-green-600' : 'text-red-600'}`}>
                {latest.f1_score != null ? latest.f1_score.toFixed(3) : '—'}
                {(latest.f1_score ?? 0) >= 0.70 ? ' ✓' : ' ✗ below 0.70 floor'}
              </dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>Precision</dt>
              <dd style={{ color: 'var(--text)' }}>{latest.precision_score != null ? latest.precision_score.toFixed(3) : '—'}</dd>
            </div>
            <div>
              <dt style={{ color: 'var(--text-muted)' }}>Recall</dt>
              <dd style={{ color: 'var(--text)' }}>{latest.recall_score != null ? latest.recall_score.toFixed(3) : '—'}</dd>
            </div>
          </dl>

          {latest.full_report && (
            <details className="mt-4">
              <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                Full report JSON
              </summary>
              <pre className="mt-2 text-xs overflow-auto p-3 rounded bg-gray-50 border" style={{ borderColor: 'var(--border)' }}>
                {JSON.stringify(latest.full_report, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {evalRows.length > 1 && (
        <div>
          <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text)' }}>History</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left" style={{ color: 'var(--text-muted)' }}>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">F1</th>
                <th className="pb-2 pr-4">P</th>
                <th className="pb-2 pr-4">R</th>
                <th className="pb-2">Rows</th>
              </tr>
            </thead>
            <tbody>
              {evalRows.map((row) => (
                <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-1.5 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(row.run_at).toLocaleDateString('en-GB')}
                  </td>
                  <td className={`py-1.5 pr-4 font-mono ${(row.f1_score ?? 0) >= 0.70 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.f1_score?.toFixed(3) ?? '—'}
                  </td>
                  <td className="py-1.5 pr-4 font-mono">{row.precision_score?.toFixed(3) ?? '—'}</td>
                  <td className="py-1.5 pr-4 font-mono">{row.recall_score?.toFixed(3) ?? '—'}</td>
                  <td className="py-1.5 font-mono">{row.row_count ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
