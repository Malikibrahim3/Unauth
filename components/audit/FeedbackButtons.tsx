'use client';

import { useState } from 'react';

interface FeedbackButtonsProps {
  transactionId: string;
  signalsThatFired: string[];
}

export default function FeedbackButtons({ transactionId, signalsThatFired }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState<'confirmed_fraud' | 'confirmed_legitimate' | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(outcome: 'confirmed_fraud' | 'confirmed_legitimate') {
    if (submitted || loading) return;
    setLoading(true);
    try {
      await fetch('/api/fraud-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          outcome,
          signals_that_fired: signalsThatFired,
        }),
      });
      setSubmitted(outcome);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-0.5 mt-1">
      <div className="flex items-center gap-1.5">
        {submitted === null && (
          <>
            <button
              onClick={() => submit('confirmed_fraud')}
              disabled={loading}
              className="text-[10px] px-1.5 py-0.5 rounded border disabled:opacity-50 transition-colors"
              style={{ borderColor: 'var(--risk-critical-bd)', color: 'var(--risk-critical)', background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--risk-critical-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Same customer confirmed
            </button>
            <button
              onClick={() => submit('confirmed_legitimate')}
              disabled={loading}
              className="text-[10px] px-1.5 py-0.5 rounded-sm border transition-colors disabled:opacity-50" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', background: 'transparent' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Different customers confirmed
            </button>
          </>
        )}
        {submitted === 'confirmed_fraud' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1" style={{ borderColor: 'var(--risk-critical-bd)', background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)' }}>
            ✓ Saved
          </span>
        )}
        {submitted === 'confirmed_legitimate' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            ✓ Saved
          </span>
        )}
      </div>
      {submitted === null && (
        <p className="text-[9px] leading-tight" style={{ color: 'var(--text-subtle)' }}>Your feedback trains the identity matching engine</p>
      )}
    </div>
  );
}
