'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

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
      router.push('/sources/connected');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Shopify');
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-md border p-5 space-y-3"
      style={{ borderColor: '#e4e3e0', background: '#fff' }}
    >
      <div>
        <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>Disconnect Shopify</p>
        <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-0.5 leading-relaxed" style={{ color: '#64686d' }}>
          Removes the link between this workspace and your Shopify store. Existing synced orders are kept - only live syncing stops.
        </p>
      </div>

      {error && (
        <p className="text-[11.5px] leading-[1.45] text-[#64686d] rounded-[8px] border px-3 py-2" style={{ borderColor: '#edc6b5', background: '#fdf0e6', color: '#b0431a' }} role="alert">{error} Retry the disconnect or reconnect Shopify if the link state is uncertain.</p>
      )}

      {confirming ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => void handleDisconnect()}
          >
            {busy ? 'Disconnecting…' : 'Yes, disconnect'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setConfirming(true)}
        >
          Disconnect Shopify
        </Button>
      )}
    </section>
  );
}
