'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/AppNavLink';
import { formatDateTime } from '@/lib/utils/format';

const button: React.CSSProperties = {
  padding: '6px 10px',
  border: 0,
  borderRadius: 9,
  background: '#fff',
  boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)',
  color: '#40454a',
  font: "400 12.5px/1 'Inter',sans-serif",
  cursor: 'pointer',
  textDecoration: 'none',
};

type RepairProps = {
  providerName: string;
  sourceHref: string;
  setupHref: string;
  category?: string;
  account?: string | null;
  lastError?: string | null;
  lastSyncAttemptAt?: string | null;
  scopes?: string[];
  onClose?: () => void;
};

function CloseGlyph() {
  return <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" /></svg>;
}

function RepairSection({ title, aside, children }: { title: string; aside: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 9, borderRadius: 12, background: '#f4f3f1' }}>
      <div style={{ padding: '1px 3px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, color: '#64686d', font: "600 10px/1 'Inter',sans-serif", letterSpacing: '.09em' }}>{title}</span>
        <span style={{ color: '#64686d', font: "400 9.5px/1 'IBM Plex Mono',monospace" }}>{aside}</span>
      </div>
      <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>{children}</div>
    </section>
  );
}

function Fact({ label, value, warning = false }: { label: string; value: React.ReactNode; warning?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span style={{ flex: 1, color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>{label}</span><span style={{ color: warning ? '#b0431a' : '#1c1f23', font: "400 12px/1.5 'IBM Plex Mono',monospace", textAlign: 'right' }}>{value}</span></div>;
}

function ChecklistRow({ checked, title, description }: { checked: boolean; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
      <span style={{ width: 14, height: 14, flex: 'none', marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, background: checked ? '#1c1f23' : '#fff', boxShadow: checked ? 'none' : 'inset 0 0 0 1.3px rgba(28,27,25,.18)' }}>
        {checked ? <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 5.2 4.1 7.3 8 3.2" /></svg> : null}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', color: '#1c1f23', font: "400 12px/1.45 'Inter',sans-serif" }}>{title}</span><span style={{ display: 'block', marginTop: 2, color: '#64686d', font: "400 11px/1.45 'Inter',sans-serif" }}>{description}</span></span>
    </div>
  );
}

export function SourceRepairOverlay({ providerName, sourceHref, setupHref, category, account, lastError, lastSyncAttemptAt, scopes = [], onClose }: RepairProps) {
  const requestedScopes = scopes.length ? scopes : ['Provider scopes unavailable'];
  return (
    <div data-overlay-id="connection-and-disconnection-modals" data-state-id="source-repair" role="dialog" aria-modal="true" aria-labelledby="source-repair-title" style={{ position: 'fixed', zIndex: 80, inset: 0, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,29,23,.30)' }}>
      <div style={{ width: 640, maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)' }}>
        <div style={{ padding: '17px 18px 15px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #eae8e5' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div id="source-repair-title" style={{ color: '#1c1f23', font: "500 15px/1.3 'Inter',sans-serif" }}>Repair the {providerName} connection</div>
            <div style={{ marginTop: 4, color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>{lastError ?? 'This connection needs renewed credentials or a fresh provider verification before its evidence can be treated as current.'}</div>
          </div>
          {onClose ? <button type="button" aria-label="Close repair dialog" onClick={onClose} style={{ flex: 'none', marginTop: 3, padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}><CloseGlyph /></button> : <Link href={sourceHref} aria-label="Close repair dialog" style={{ flex: 'none', marginTop: 3, display: 'flex' }}><CloseGlyph /></Link>}
        </div>
        <div style={{ flex: 1, minHeight: 0, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11, overflowY: 'auto' }}>
          <RepairSection title="WHAT BROKE" aside="read from the last failed check">
            <Fact label="Provider" value={`${providerName} · ${category?.replaceAll('_', ' ') ?? 'source'}`} />
            <Fact label="Account" value={account ?? 'Unavailable'} />
            <Fact label="Failing since" value={lastSyncAttemptAt ? formatDateTime(lastSyncAttemptAt) : 'Unavailable'} warning={Boolean(lastSyncAttemptAt)} />
            <Fact label="Provider response" value={lastError ?? 'No provider error retained'} warning={Boolean(lastError)} />
            <Fact label="Runs skipped" value="Unavailable" />
            <Fact label="Open cases affected" value="Unavailable" />
          </RepairSection>
          <RepairSection title="SCOPE THIS RE-AUTH ASKS FOR" aside="compared with the retained grant">
            {requestedScopes.map((scope) => <div key={scope} style={{ display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ flex: 1, color: '#40454a', font: "400 11.5px/1.4 'IBM Plex Mono',monospace" }}>{scope}</span><span style={{ padding: '2px 7px', borderRadius: 5, background: '#f4f3f1', color: '#40454a', font: "500 10px/1.5 'Inter',sans-serif" }}>{scopes.length ? 'REQUESTED' : 'UNAVAILABLE'}</span></div>)}
            <div style={{ paddingTop: 8, borderTop: '1px solid #f4f2ef', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>The provider setup screen shows the exact credential or OAuth boundary before anything is submitted.</div>
          </RepairSection>
          <RepairSection title="WHAT HAPPENS AFTER YOU SIGN IN" aside="nothing changes until the provider returns">
            <ChecklistRow checked title={`Re-authorise ${providerName}`} description="The existing provider identity is renewed through its canonical setup flow." />
            <ChecklistRow checked title="Verify the returned credentials" description="Connection health changes only after the provider check completes." />
            <ChecklistRow checked={false} title="Run or backfill source data" description="A sync is not inferred from re-authorisation; use the source action after verification where supported." />
          </RepairSection>
        </div>
        <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #eae8e5', background: '#ffffff' }}>
          <span style={{ flex: 1, minWidth: 0, color: '#64686d', font: "400 10.5px/1.45 'IBM Plex Mono',monospace" }}>you will be sent to {providerName.toLowerCase()} setup · nothing changes until you submit or return</span>
          <Link href={sourceHref} style={{ padding: '7px 12px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a', font: "400 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Cancel</Link>
          <Link href={setupHref} style={{ padding: '7px 13px', borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12.5px/1 'Inter',sans-serif", textDecoration: 'none' }}>Re-authorise</Link>
        </div>
      </div>
    </div>
  );
}

type Props = RepairProps & {
  providerId: string;
  canManage: boolean;
  connected: boolean;
  planned?: boolean;
  placement?: 'header' | 'card';
};

export function SourceConnectionActionsOperations({ providerId, providerName, sourceHref, setupHref, canManage, connected, planned = false, placement = 'header', category, account, lastError, lastSyncAttemptAt, scopes }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'sync' | 'disconnect' | null>(null);
  const [repairing, setRepairing] = useState(false);
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

  if (!canManage) return placement === 'card' ? <p style={{ margin: 0, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>Read-only access. Connection actions require settings-management permission.</p> : null;
  if (planned) return placement === 'card' ? <p style={{ margin: 0, color: '#64686d', font: "400 11.5px/1.5 'Inter',sans-serif" }}>This provider is planned and cannot be connected yet.</p> : <span style={{ color: '#64686d', font: "400 11.5px/1.45 'Inter',sans-serif" }}>Not available</span>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {connected ? <button type="button" disabled={busy !== null} onClick={() => void sync()} style={{ ...button, opacity: busy === 'sync' ? .6 : 1 }}>{busy === 'sync' ? 'Syncing…' : 'Sync now'}</button> : null}
      <button type="button" onClick={() => setRepairing(true)} style={button}>{connected ? 'Re-authorise' : 'Connect source'}</button>
      {connected ? <button type="button" onClick={() => setDisconnecting(true)} style={{ ...button, color: '#b0431a', boxShadow: 'inset 0 0 0 1px rgba(176,67,26,.35)' }}>Disconnect</button> : null}
      {message ? <span role="status" style={{ maxWidth: 260, color: message.toLowerCase().includes('fail') ? '#b0431a' : '#64686d', font: "400 10.5px/1.35 'Inter',sans-serif" }}>{message}</span> : null}
      {repairing ? <SourceRepairOverlay providerName={providerName} sourceHref={sourceHref} setupHref={setupHref} category={category} account={account} lastError={lastError} lastSyncAttemptAt={lastSyncAttemptAt} scopes={scopes} onClose={() => setRepairing(false)} /> : null}
      {disconnecting ? (
        <div data-overlay-id="connection-and-disconnection-modals" role="dialog" aria-modal="true" aria-labelledby="disconnect-source-title" style={{ position: 'fixed', zIndex: 80, inset: 0, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,29,23,.30)' }}>
          <div style={{ width: 620, overflow: 'hidden', borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)' }}>
            <div style={{ padding: '17px 18px 15px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid #eae8e5' }}><div style={{ flex: 1 }}><div id="disconnect-source-title" style={{ color: '#1c1f23', font: "500 15px/1.3 'Inter',sans-serif" }}>Disconnect {providerName}</div><div style={{ marginTop: 4, color: '#64686d', font: "400 12px/1.5 'Inter',sans-serif" }}>Future ingestion stops. Canonical records, evidence and audit history remain available.</div></div><button type="button" aria-label="Close disconnect dialog" onClick={() => { setDisconnecting(false); setDisconnectConfirmation(''); }} style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}><CloseGlyph /></button></div>
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: 13, borderRadius: 11, background: '#f4f3f1', color: '#64686d', font: "400 11.5px/1.55 'Inter',sans-serif" }}>Reconnect later to resume future ingestion. Existing records are retained. Source freshness becomes unavailable rather than zero, and the disconnection is appended to the audit trail.</div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, color: '#64686d', font: "500 11px/1.4 'Inter',sans-serif" }}>Type {providerName.toUpperCase()} to confirm<input value={disconnectConfirmation} onChange={(event) => setDisconnectConfirmation(event.target.value)} autoComplete="off" style={{ height: 36, padding: '0 10px', border: 0, borderRadius: 9, outline: 'none', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.14)', color: '#1c1f23', font: "400 12.5px/1 'Inter',sans-serif" }} /></label>
            </div>
            <div style={{ padding: '13px 18px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #eae8e5', background: '#ffffff' }}><button type="button" onClick={() => { setDisconnecting(false); setDisconnectConfirmation(''); }} style={button}>Cancel</button><button type="button" disabled={busy === 'disconnect' || disconnectConfirmation !== providerName.toUpperCase()} onClick={() => void disconnect()} style={{ ...button, background: '#b0431a', color: '#fff', boxShadow: 'none', opacity: busy === 'disconnect' || disconnectConfirmation !== providerName.toUpperCase() ? .45 : 1 }}>{busy === 'disconnect' ? 'Disconnecting…' : `Disconnect ${providerName}`}</button></div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
