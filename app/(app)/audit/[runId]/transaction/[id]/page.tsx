import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils/format';
import { signalLabel } from '@/lib/copy/signalLabels';
import ConfidenceGrade, { riskLevelToGrade } from '@/components/ConfidenceGrade';
import RecommendedAction from '@/components/audit/RecommendedAction';
import type { SignalResult } from '@/lib/engine/types';
import type { Database } from '@/lib/supabase/types';

type TxRow = Database['public']['Tables']['transactions']['Row'];

interface Props {
  params: { runId: string; id: string };
}

export default async function TransactionDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!tx) notFound();

  const txData = tx as unknown as TxRow;
  const signals = (txData.signals_fired as unknown as SignalResult[]) ?? [];
  const firedSignals = signals.filter((s) => s.fired).sort((a, b) => b.score - a.score);

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <span>/</span>
          <Link href={`/audit/${params.runId}`} className="hover:underline">Audit</Link>
          <span>/</span>
          <span>Transaction</span>
        </div>
        <h1 className="text-heading-lg">Order {txData.external_order_id}</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg px-5 py-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Identity confidence</div>
          <div className="text-display-sm font-bold" style={{ color: 'var(--text)' }}>{Math.round(txData.match_score)} / 100</div>
          <div className="mt-1"><ConfidenceGrade grade={riskLevelToGrade(txData.risk_tier)} /></div>
        </div>
        <div className="rounded-lg px-5 py-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Order total</div>
          <div className="text-display-sm font-bold" style={{ color: 'var(--text)' }}>{formatCurrency(txData.order_total, txData.currency)}</div>
        </div>
        <div className="rounded-lg px-5 py-4 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>Order date</div>
          <div className="text-body-md font-medium" style={{ color: 'var(--text)' }}>{formatDate(txData.order_date)}</div>
        </div>
      </div>

      <div className="rounded-lg p-5 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <h2 className="text-heading-sm mb-3">Order details</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            { label: 'Order ID', value: txData.external_order_id },
            { label: 'Status', value: txData.order_status ?? '—' },
            { label: 'Refund status', value: txData.refund_status ?? '—' },
            { label: 'Refund reason', value: txData.refund_reason ?? '—' },
            { label: 'Refund date', value: txData.refund_date ? formatDate(txData.refund_date) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <dt style={{ color: 'var(--text-muted)' }}>{label}</dt>
              <dd className="font-mono text-xs font-medium" style={{ color: 'var(--text)' }}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-lg p-5 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <h2 className="text-heading-sm mb-3">Signals fired ({firedSignals.length})</h2>
        {firedSignals.length === 0 ? (
          <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>No signals fired. Transaction scored below flag threshold.</p>
        ) : (
          <div className="space-y-3">
            {firedSignals.map((sig) => (
              <div key={sig.name} className="rounded-lg p-4 border" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{signalLabel(sig.name).title}</span>
                  <span className="font-mono font-bold text-sm" style={{ color: 'var(--text)' }}>{sig.score}</span>
                </div>
                <p className="text-body-sm" style={{ color: 'var(--text-muted)' }}>{sig.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <RecommendedAction
        tier={txData.risk_tier as 'low' | 'medium' | 'high' | 'critical'}
        topSignalName={firedSignals[0]?.name}
        customersHref={`/audit/${params.runId}/customers`}
      />

      {/* Right-rail: generate evidence for this order */}
      {(txData.risk_tier === 'high' || txData.risk_tier === 'critical') && (
        <div
          className="rounded-lg p-5 border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <h2 className="text-heading-sm mb-2">Chargeback evidence</h2>
          <p className="text-body-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            If this order is subject to a chargeback, generate a representment evidence package. Where eligible, it will be formatted for Visa Compelling Evidence 3.0.
          </p>
          <Link
            href={`/audit/${params.runId}/customers`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            Generate evidence for this order →
          </Link>
        </div>
      )}

      <div className="flex gap-4">
        <Link
          href={`/audit/${params.runId}/customers`}
          className="text-sm font-medium underline"
          style={{ color: 'var(--text)' }}
        >
          View customer profile →
        </Link>
        <Link
          href={`/audit/${params.runId}`}
          className="text-sm hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Back to audit
        </Link>
      </div>
    </div>
  );
}
