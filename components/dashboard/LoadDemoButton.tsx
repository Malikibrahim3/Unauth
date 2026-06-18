'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function LoadDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDemoAccount() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        console.error('Invalid JSON response:', text);
        throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
      }
      if (!res.ok) throw new Error(json.error ?? `Server error (${res.status})`);
      router.push('/reports');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
type="button"         onClick={loadDemoAccount}
        disabled={loading}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        style={{ background: 'var(--accent)', color: 'white' }}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-3.5 w-3.5" aria-hidden="true" />
            Loading demo context…
          </>
        ) : (
          'See sample context'
        )}
      </button>
      {error && <p className="mt-2 text-caption" style={{ color: 'var(--risk-critical)' }}>{error}</p>}
    </div>
  );
}
