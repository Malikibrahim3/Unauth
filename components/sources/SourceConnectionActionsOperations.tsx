'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BeforeYouConfirm, Button, ButtonLink, Input, Modal } from '@/components/ui';

type Props = {
  providerId: string;
  providerName: string;
  setupHref: string;
  canManage: boolean;
  connected: boolean;
  planned?: boolean;
  placement?: 'header' | 'card';
};

export function SourceConnectionActionsOperations({ providerId, providerName, setupHref, canManage, connected, planned = false, placement = 'header' }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'sync' | 'disconnect' | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectConfirmation, setDisconnectConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function post(path: string) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? `${providerName} action failed`);
    return payload;
  }

  async function sync() {
    setBusy('sync');
    setMessage(null);
    try {
      const payload = await post(providerId === 'shipbob' ? '/api/integrations/shipbob/sync-account' : `/api/integrations/${providerId}/sync`);
      setMessage(payload.ran === false ? 'A sync is already running or no retry is due.' : 'Sync completed.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy('disconnect');
    setMessage(null);
    try {
      await post(`/api/integrations/${providerId}/disconnect`);
      setDisconnecting(false);
      setDisconnectConfirmation('');
      setMessage(`${providerName} disconnected. Canonical records and audit history were retained.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Disconnect failed');
    } finally {
      setBusy(null);
    }
  }

  if (!canManage) return placement === 'card' ? <p className="uo-muted">Read-only access. Connection actions require settings-management permission.</p> : null;
  if (planned) {
    return placement === 'card'
      ? <p className="uo-muted">This provider is planned and cannot be connected yet.</p>
      : <span className="ua-text-caption-role text-[var(--uo-route-text-secondary)]">Not available</span>;
  }

  return (
    <div className={placement === 'header' ? 'uo-source-actions uo-source-actions--header' : 'uo-source-actions uo-source-actions--card'}>
      {connected ? <Button variant="secondary" size="sm" loading={busy === 'sync'} onClick={() => void sync()}>Run sync now</Button> : null}
      <ButtonLink href={setupHref} size="sm">{connected ? 'Repair connection' : 'Connect source'}</ButtonLink>
      {placement === 'card' && connected ? <Button variant="secondary" size="sm" onClick={() => setDisconnecting(true)}>Disconnect</Button> : null}
      {message ? <p role="status">{message}</p> : null}
      <Modal
        open={disconnecting}
        onClose={() => { setDisconnecting(false); setDisconnectConfirmation(''); }}
        title={`Disconnect ${providerName}`}
        description="Future ingestion stops. Canonical records, evidence and audit history remain available."
        overlayId="connection-and-disconnection-modals"
        actions={[{ label: busy === 'disconnect' ? 'Disconnecting…' : `Disconnect ${providerName}`, variant: 'danger', onClick: disconnect, disabled: busy === 'disconnect' || disconnectConfirmation !== providerName.toUpperCase() }]}
      >
        <div className="space-y-4">
          <p className="ua-text-body text-[var(--uo-route-text-secondary)]">Reconnect later to resume future ingestion. Existing records are retained.</p>
          <label className="ua-text-label grid gap-1">Type {providerName.toUpperCase()} to confirm<Input value={disconnectConfirmation} onChange={(event) => setDisconnectConfirmation(event.target.value)} autoComplete="off" /></label>
          <BeforeYouConfirm
            objectSummary={`${providerName} connection`}
            valueSummary="No figure is deleted. Source freshness becomes unavailable rather than zero."
            externalAction={`Yes. Unauth revokes or disables ${providerName} access and stops future ingestion.`}
            reversible="You can reconnect, but the coverage gap remains visible and may need a source-supported backfill."
            appendOnly="A disconnection event, the resulting coverage changes and an audit entry."
          />
        </div>
      </Modal>
    </div>
  );
}
