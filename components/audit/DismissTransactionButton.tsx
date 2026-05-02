'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, AlertCircle } from 'lucide-react';

export default function DismissTransactionButton({ txId }: { txId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDismiss() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/transactions/${txId}/dismiss`, { method: 'PATCH' });
    if (res.ok) {
      router.refresh();
    } else {
      setError('Failed to dismiss');
      setLoading(false);
      setConfirming(false);
    }
  }

  if (error) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px]" style={{ color: 'var(--risk-critical)' }}>
        <AlertCircle className="h-3 w-3" />{error}
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          onClick={handleDismiss}
          disabled={loading}
          className="text-xs font-medium disabled:opacity-50"
          style={{ color: 'var(--risk-critical)' }}
        >
          {loading ? 'Dismissing…' : 'Dismiss'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs transition-colors" style={{ color: 'var(--text-subtle)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-subtle)')}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="transition-colors ml-2" style={{ color: 'var(--text-disabled)' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--risk-critical)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-disabled)')}
      title="Dismiss transaction"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
