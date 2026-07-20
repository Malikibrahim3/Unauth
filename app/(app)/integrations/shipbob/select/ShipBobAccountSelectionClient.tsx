'use client';

import { useEffect, useState } from 'react';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

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
    <div>
      <AuthenticatedPageHeader
        eyebrow="Integration setup"
        title="Choose a ShipBob channel"
        subtitle="The selected channel owns this connection, its imports, webhooks, records, health, and audit history."
        breadcrumbs={[{ label: 'Integrations', href: '/integrations' }, { label: 'ShipBob' }, { label: 'Select channel' }]}
        meta={<span className="text-[10px] text-[var(--text-tertiary)]">Environment · {environment}</span>}
      />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel
          title="Channel ownership"
          description="Select exactly one account for this workspace connection."
          bodyClassName="grid max-w-2xl gap-3 p-4"
        >
          {accounts.length > 0 ? (
            <label className="grid gap-1.5 text-[11px] font-semibold text-[var(--text-primary)]">
              Channel
              <select
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
                disabled={status !== 'ready'}
                className="h-8 rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-normal outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name ?? account.id}</option>)}
              </select>
            </label>
          ) : null}
          {message ? <p role={status === 'error' ? 'alert' : 'status'} className="rounded-[var(--ua-radius-input)] border border-[var(--border-muted)] bg-[var(--surface-sunken)] px-3 py-2.5 text-[11px] leading-5 text-[var(--text-secondary)]">{message}</p> : null}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={status !== 'ready' || !selected}
            className="inline-flex h-8 w-fit items-center rounded-[var(--ua-radius-input)] bg-[var(--accent)] px-3 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {status === 'saving' ? 'Connecting…' : 'Connect selected channel'}
          </button>
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
