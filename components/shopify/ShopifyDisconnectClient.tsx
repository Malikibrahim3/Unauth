'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ShopifyDisconnectClient() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/shopify/disconnect', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Failed to disconnect');
      router.push('/settings/integrations');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Shopify');
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-xl border p-5 space-y-3"
      style={{ borderColor: 'color-mix(in srgb, var(--risk-high, #DC2626) 30%, var(--surface-border))', background: 'var(--surface-raised)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Disconnect Shopify</p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Removes the link between this workspace and your Shopify store. Existing synced orders are kept — only live syncing stops.
        </p>
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--risk-high, #DC2626)' }}>{error}</p>
      )}

      {confirming ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDisconnect()}
            className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            style={{ background: 'var(--risk-high, #DC2626)', color: '#fff' }}
          >
            {busy ? 'Disconnecting…' : 'Yes, disconnect'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium"
          style={{ borderColor: 'color-mix(in srgb, var(--risk-high, #DC2626) 40%, var(--surface-border))', color: 'var(--risk-high, #DC2626)' }}
        >
          Disconnect Shopify
        </button>
      )}
    </section>
  );
}
