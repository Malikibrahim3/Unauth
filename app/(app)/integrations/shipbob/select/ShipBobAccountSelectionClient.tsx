'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageFrame } from '@/components/ui/PageFrame';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import { Button, Select } from '@/components/ui';
import { useFetchJson } from '@/lib/react/useFetchJson';

type Account = { id: string; name: string | null };
type SelectionResponse = {
  accounts: Account[];
  environment: string;
  expiresAt: string;
};

export default function ShipBobAccountSelectionClient({ selectionId }: { selectionId: string }) {
  const [selected, setSelected] = useState('');
  const [submission, setSubmission] = useState<
    { status: 'idle' | 'saving' | 'error'; message: string }
  >({ status: 'idle', message: '' });
  const resource = useFetchJson<SelectionResponse>(
    selectionId
      ? `/api/integrations/shipbob/selection?selection=${encodeURIComponent(selectionId)}`
      : null,
    {
      parse: async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error ?? 'Unable to load ShipBob channels.');
        }
        return body as SelectionResponse;
      },
    },
  );
  const accounts = resource.data?.accounts ?? [];
  const environment = resource.data?.environment ?? 'production';
  const effectiveSelected = selected || accounts[0]?.id || '';
  const invalidSelection = !selectionId;
  const status =
    submission.status === 'saving'
      ? 'saving'
      : submission.status === 'error' || invalidSelection || resource.status === 'error'
        ? 'error'
        : resource.status === 'success' || resource.status === 'refreshing'
          ? 'ready'
          : 'loading';
  const message =
    submission.message
    || (invalidSelection
      ? 'This account-selection link is invalid. Start the ShipBob connection again.'
      : resource.status === 'error'
        ? resource.error
        : resource.isInitialLoading
          ? 'Discovering ShipBob channels…'
          : accounts.length === 0
            ? 'No ShipBob channels are available for this account. Choose another ShipBob account or try again later.'
            : '');

  const submit = async () => {
    if (!effectiveSelected || status !== 'ready') return;
    setSubmission({
      status: 'saving',
      message: 'Connecting the selected channel and starting the initial import…',
    });
    try {
      const response = await fetch('/api/integrations/shipbob/selection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ selectionId, accountId: effectiveSelected }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'ShipBob connection failed.');
      window.location.assign(body.redirect);
    } catch (error) {
      setSubmission({
        status: 'error',
        message: error instanceof Error ? error.message : 'ShipBob connection failed.',
      });
    }
  };

  return (
    <PageFrame
      title="Choose a ShipBob channel"
      subtitle="The selected channel owns this connection, its imports, webhooks, records, health, and audit history."
      breadcrumbs={[{ label: 'Integrations', href: '/integrations' }, { label: 'ShipBob' }, { label: 'Select channel' }]}
      meta={<span className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">Environment · {environment}</span>}
    >
        <AuthenticatedPanel
          title="Channel ownership"
          description="Select exactly one account for this workspace connection."
          bodyClassName="grid max-w-2xl gap-3 p-4"
        >
          {accounts.length > 0 ? (
            <label className="ua-text-label grid gap-1.5 text-[var(--ua-text-primary)]">
              Channel
              <Select
                value={effectiveSelected}
                onChange={(event) => setSelected(event.target.value)}
                disabled={status !== 'ready'}
              >
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name ?? account.id}</option>)}
              </Select>
            </label>
          ) : null}
          {message ? <p role={status === 'error' ? 'alert' : 'status'} className="rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] px-3 py-2.5 text-[length:var(--ua-text-metadata-size)] leading-5 text-[var(--ua-text-secondary)]">{message}</p> : null}
          {status === 'error' ? (
            <Link
              href="/integrations/shipbob"
              className="ua-text-label inline-flex h-8 w-fit items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 text-[var(--ua-text-primary)]"
            >
              Start ShipBob connection again
            </Link>
          ) : null}
          {status === 'ready' && accounts.length === 0 ? (
            <Link
              href="/integrations/shipbob"
              className="ua-text-label inline-flex h-8 w-fit items-center rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] px-3 text-[var(--ua-text-primary)]"
            >
              Return to ShipBob
            </Link>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => void submit()}
            disabled={status !== 'ready' || !effectiveSelected}
            loading={status === 'saving'}
          >
            {status === 'saving' ? 'Connecting…' : 'Connect selected channel'}
          </Button>
        </AuthenticatedPanel>
    </PageFrame>
  );
}
