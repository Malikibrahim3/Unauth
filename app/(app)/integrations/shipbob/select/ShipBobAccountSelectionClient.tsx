'use client';

import { useEffect, useState } from 'react';

type Account = { id: string; name: string | null };

export default function ShipBobAccountSelectionClient({ selectionId }: { selectionId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState('');
  const [environment, setEnvironment] = useState('production');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading');
  const [message, setMessage] = useState('Discovering ShipBob channels…');

  useEffect(() => {
    if (!selectionId) {
      setStatus('error');
      setMessage('This account-selection link is invalid. Start the ShipBob connection again.');
      return;
    }
    void fetch(`/api/integrations/shipbob/selection?selection=${encodeURIComponent(selectionId)}`)
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.error ?? 'Unable to load ShipBob channels.');
        setAccounts(body.accounts);
        setSelected(body.accounts[0]?.id ?? '');
        setEnvironment(body.environment);
        setStatus('ready');
        setMessage('');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to load ShipBob channels.');
      });
  }, [selectionId]);

  const submit = async () => {
    if (!selected || status !== 'ready') return;
    setStatus('saving');
    setMessage('Connecting the selected channel and starting the initial import…');
    try {
      const response = await fetch('/api/integrations/shipbob/selection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ selectionId, accountId: selected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'ShipBob connection failed.');
      window.location.assign(body.redirect);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'ShipBob connection failed.');
    }
  };

  return (
    <main style={{ maxWidth: 640, margin: '48px auto', padding: 24 }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>ShipBob · {environment}</p>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Choose the ShipBob channel to connect</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
        Only the channel you select will own this connection, its import, webhooks, records, health, and audit history.
      </p>
      {accounts.length > 0 && (
        <label style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
          <span>Channel</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={status !== 'ready'} style={{ minHeight: 44, padding: '0 12px' }}>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name ?? account.id}</option>)}
          </select>
        </label>
      )}
      {message && <p role={status === 'error' ? 'alert' : 'status'} style={{ marginBottom: 16 }}>{message}</p>}
      <button type="button" onClick={() => void submit()} disabled={status !== 'ready' || !selected} style={{ minHeight: 44, padding: '0 18px' }}>
        {status === 'saving' ? 'Connecting…' : 'Connect selected channel'}
      </button>
    </main>
  );
}
