'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoadDemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
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
      router.push(`/audit/${json.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Scoring 3,000 transactions…
          </>
        ) : (
          'See a sample audit →'
        )}
      </button>
      {error && <p className="mt-2 text-caption" style={{ color: 'var(--risk-critical)' }}>{error}</p>}
    </div>
  );
}
