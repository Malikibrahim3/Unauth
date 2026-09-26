'use client';

import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { projectConnectionActionMode } from '@/lib/connections/actionMode';
import type { ConnectionConfigurationState, ConnectionOperationalState } from '@/lib/connections/readModel';
import type { EffectiveConnectionBadge } from '@/lib/connections/effectiveStatus';
import { getIntegrationProvider } from '@/lib/integrations/registry';
import { normalizeShopInput } from '@/lib/shopify/normalizeShopInput';
import { SyncStatusConnectModal } from '@/components/shopify/SyncStatusConnectModal';

type Dialog = 'connect' | 'disconnect' | 'shipbob' | 'local' | null;

const button: CSSProperties = { padding: '7px 11px', border: 0, borderRadius: 9, background: '#1c1f23', color: '#fff', font: "500 12px/1 'Inter',sans-serif", cursor: 'pointer' };
const secondaryButton: CSSProperties = { ...button, background: '#fff', color: '#40454a', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)' };
const field: CSSProperties = { width: '100%', padding: '8px 9px', border: 0, outline: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#1c1f23', font: "400 12px/1.35 'Inter',sans-serif" };

function preserveReturnPath(href: string, returnTo: string | undefined) {
  if (!returnTo) return href;
  const destination = new URL(href, 'https://application.local');
  destination.searchParams.set('returnTo', returnTo);
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

function ModalBoundary({ title, description, busy, onClose, children, actions }: { title: string; description: string; busy: boolean; onClose: () => void; children: ReactNode; actions: ReactNode }) {
  return (
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 96, padding: 40, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section role="dialog" data-overlay-id="connection-and-disconnection-modals" aria-modal="true" aria-labelledby="connection-boundary-title" style={{ width: 620, maxWidth: 'calc(100vw - 40px)', maxHeight: 'calc(100vh - 40px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 14, background: '#fff', boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)' }}>
        <header style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}><div style={{ flex: 1, minWidth: 0 }}><h2 id="connection-boundary-title" style={{ margin: 0, font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{title}</h2><div style={{ marginTop: 4, font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d' }}>{description}</div></div><button type="button" aria-label="Close" disabled={busy} onClick={onClose} style={{ width: 18, height: 18, padding: 0, border: 0, background: 'transparent', cursor: busy ? 'wait' : 'pointer' }}><svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4"/></svg></button></header>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px' }}>{children}</div>
        <footer style={{ padding: '13px 18px', borderTop: '1px solid #eae8e5', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}><button type="button" disabled={busy} onClick={onClose} style={secondaryButton}>Cancel</button>{actions}</footer>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}><span style={{ font: "400 9.5px/1 'IBM Plex Mono',monospace", letterSpacing: '.05em', color: '#64686d' }}>{label.toUpperCase()}</span>{children}</label>;
}

export function ConnectionActions({ providerId, providerName, configuration, operational, badge, note, canManage, returnTo }: {
  providerId: string;
  providerName: string;
  configuration: ConnectionConfigurationState;
  operational: ConnectionOperationalState;
  badge: EffectiveConnectionBadge;
  note?: string | null;
  canManage: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const actionMode = projectConnectionActionMode({ configuration, operational, badge, providerId });
  const connected = configuration === 'configured';
  const isCarrier = providerId === 'ups' || providerId === 'fedex';
  const isLocal = providerId === 'self_fulfillment_pack';
  const isSupport = ['gorgias', 'freshdesk', 'zendesk'].includes(providerId);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('production');
  const [account, setAccount] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [oneTimeSecret, setOneTimeSecret] = useState<{ value: string; url?: string; header?: string } | null>(null);

  const setup = getIntegrationProvider(providerId)?.setupHref;
  const setupWithReturn = setup ? preserveReturnPath(setup, returnTo) : null;

  async function post(path: string, body: unknown = {}) {
    const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error ?? `${providerName} action failed`);
    return payload as Record<string, any>;
  }

  function clearSensitive() {
    setAccount('');
    setDisplayName('');
    setEmail('');
    setSecret('');
    setAccountNumber('');
  }

  function closeDialog() {
    if (busy) return;
    setDialog(null);
    setConfirmation('');
    clearSensitive();
  }

  async function connect(event?: FormEvent) {
    event?.preventDefault();
    setBusy('connect');
    setMessage(null);
    try {
      if (providerId === 'shopify') {
        const normalized = normalizeShopInput(account);
        if (normalized.error === 'empty') throw new Error('Enter the Shopify Admin URL.');
        if (normalized.error === 'public_domain') throw new Error('Use the Shopify Admin URL, not the public storefront address.');
        if (normalized.error === 'invalid') throw new Error('Use admin.shopify.com/store/your-store or your-store.myshopify.com.');
        window.location.assign(`/api/shopify/install?shop=${encodeURIComponent(normalized.domain as string)}`);
        return;
      }
      if (providerId === 'gorgias') {
        const domain = account.trim();
        const payload = await post('/api/settings/gorgias/support-connection', domain.includes('.') ? { domain, name: displayName.trim() || undefined, gorgias_api_email: email.trim(), gorgias_api_key: secret.trim() } : { account_id: domain, name: displayName.trim() || undefined, gorgias_api_email: email.trim(), gorgias_api_key: secret.trim() });
        if (typeof payload.webhook_secret_plaintext === 'string') setOneTimeSecret({ value: payload.webhook_secret_plaintext, url: typeof payload.webhook_url === 'string' ? payload.webhook_url : undefined, header: typeof payload.header_name === 'string' ? payload.header_name : 'X-Unauth-Webhook-Secret' });
      } else if (providerId === 'freshdesk') {
        const payload = await post('/api/settings/freshdesk/support-connection', { domain: account.trim(), name: displayName.trim() || undefined, freshdesk_api_key: secret.trim() });
        if (typeof payload.webhook_secret_plaintext === 'string') setOneTimeSecret({ value: payload.webhook_secret_plaintext, url: typeof payload.webhook_url === 'string' ? payload.webhook_url : undefined, header: typeof payload.header_name === 'string' ? payload.header_name : 'X-Unauth-Webhook-Secret' });
      } else if (providerId === 'zendesk') {
        await post('/api/settings/zendesk/connection', { subdomain: account.trim(), name: displayName.trim() || undefined, zendesk_agent_email: email.trim(), zendesk_api_token: secret.trim() });
      } else if (isCarrier) {
        await post(`/api/integrations/${providerId}/connect`, { clientId: account.trim(), clientSecret: secret.trim(), accountNumber: accountNumber.trim() || undefined, environment });
      } else if (isLocal) {
        await post(`/api/integrations/${providerId}/connect`);
      }
      setMessage({ tone: 'success', text: `${providerName} connection recorded. Authorisation, returned data and source health remain separate checks.` });
      setDialog(null);
      clearSensitive();
      router.refresh();
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : `${providerName} connection failed` });
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy('sync');
    setMessage(null);
    try {
      const path = providerId === 'shipbob' ? '/api/integrations/shipbob/sync-account' : providerId === 'freshdesk' ? '/api/settings/freshdesk/support-connection/sync' : providerId === 'zendesk' ? '/api/settings/zendesk/sync' : `/api/integrations/${providerId}/sync`;
      const payload = await post(path);
      setMessage({ tone: 'success', text: payload.ran === false ? 'A sync is already running or no retry is due.' : `Sync completed${payload.importedRecords != null ? ` · ${payload.importedRecords} records` : payload.ingested != null ? ` · ${payload.ingested} records` : ''}.` });
      router.refresh();
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Sync failed' });
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    setBusy('disconnect');
    setMessage(null);
    try {
      const path = providerId === 'shopify' ? '/api/shopify/disconnect' : providerId === 'gorgias' ? '/api/settings/gorgias/support-connection/disable' : providerId === 'freshdesk' ? '/api/settings/freshdesk/support-connection/disable' : `/api/integrations/${providerId}/disconnect`;
      await post(path);
      setDialog(null);
      setConfirmation('');
      setMessage({ tone: 'success', text: `${providerName} disconnected. Stored canonical records and audit history were retained.` });
      router.refresh();
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Disconnect failed' });
    } finally {
      setBusy(null);
    }
  }

  async function rotateSecret() {
    if (!isSupport || providerId === 'zendesk') return;
    setBusy('rotate');
    setMessage(null);
    try {
      const payload = await post(`/api/settings/${providerId}/support-connection/rotate-secret`);
      if (typeof payload.webhook_secret_plaintext !== 'string') throw new Error('The provider did not return a one-time secret.');
      setOneTimeSecret({ value: payload.webhook_secret_plaintext, url: typeof payload.webhook_url === 'string' ? payload.webhook_url : undefined, header: typeof payload.header_name === 'string' ? payload.header_name : 'X-Unauth-Webhook-Secret' });
      setMessage({ tone: 'success', text: 'Webhook secret rotated. Save the one-time value now; it will not be shown again.' });
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Secret rotation failed' });
    } finally {
      setBusy(null);
    }
  }

  async function verifyZendesk() {
    setBusy('verify');
    setMessage(null);
    try {
      await post('/api/settings/zendesk/verify-install');
      setMessage({ tone: 'success', text: 'Zendesk private app installation verified.' });
      router.refresh();
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Zendesk verification failed' });
    } finally {
      setBusy(null);
    }
  }

  async function downloadChrome() {
    setBusy('download');
    setMessage(null);
    try {
      const response = await fetch('/api/settings/chrome/download');
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? 'Extension download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'unauth-chrome-extension.zip';
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage({ tone: 'success', text: 'Chrome extension package downloaded.' });
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Extension download failed' });
    } finally {
      setBusy(null);
    }
  }

  if (!canManage) return <div style={{ padding: '11px 12px', borderRadius: 10, background: '#f4f3f1', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>You have read-only access. Managing credentials, retries and disconnection requires settings-management permission.</div>;
  if (actionMode.mode === 'unavailable') return <div style={{ padding: '11px 12px', borderRadius: 10, background: '#f4f3f1', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>Connection controls are unavailable because the resolved configuration and health state are incompatible. No action was offered.</div>;

  const canDirectConnect = providerId === 'shopify' || isSupport || isCarrier || providerId === 'shipbob' || isLocal;
  const connectDisabled = providerId === 'gorgias' ? account.trim().length < 2 || email.trim().length < 3 || secret.trim().length < 3 : providerId === 'freshdesk' ? account.trim().length < 2 || secret.trim().length < 3 : providerId === 'zendesk' ? account.trim().length < 2 || email.trim().length < 3 || secret.trim().length < 3 : isCarrier ? account.trim().length < 3 || secret.trim().length < 3 : providerId === 'shopify' ? Boolean(normalizeShopInput(account).error) : false;

  return (
    <section aria-labelledby="connection-controls-title" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div><h2 id="connection-controls-title" style={{ margin: 0, font: "500 13px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{actionMode.mode === 'connect' ? `Connect ${providerName}` : actionMode.mode === 'repair' ? `Repair ${providerName}` : 'Connection controls'}</h2><p style={{ margin: '4px 0 0', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>{actionMode.mode === 'connect' ? 'Connect this provider to make its supported source records available to case evidence.' : actionMode.mode === 'repair' ? 'Repair credentials or setup. Existing records and audit history stay available.' : 'Refresh access, review setup, or stop future ingestion. Existing records and audit history stay available.'}</p></div>
      {note ? <p style={{ margin: 0, font: "400 10.5px/1.45 'IBM Plex Mono',monospace", color: '#64686d' }}>{note}</p> : null}
      {message ? <div role={message.tone === 'error' ? 'alert' : 'status'} style={{ padding: '10px 12px', borderRadius: 10, background: message.tone === 'error' ? '#fdf0e6' : '#eef6f1', color: message.tone === 'error' ? '#b0431a' : '#1a6b43', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{message.text}</div> : null}
      {oneTimeSecret ? <div style={{ padding: '11px 12px', borderRadius: 10, background: '#fff3e9', font: "400 11px/1.5 'Inter',sans-serif", color: '#7a5310' }}><strong style={{ display: 'block', marginBottom: 5 }}>Save this one-time webhook secret now</strong>{oneTimeSecret.url ? <code style={{ display: 'block', overflowWrap: 'anywhere' }}>{oneTimeSecret.url}</code> : null}<code style={{ display: 'block', marginTop: 3, overflowWrap: 'anywhere' }}>{oneTimeSecret.header ?? 'Webhook secret'}: {oneTimeSecret.value}</code></div> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {providerId === 'chrome' ? <button type="button" disabled={Boolean(busy)} onClick={() => void downloadChrome()} style={button}>{busy === 'download' ? 'Preparing…' : 'Download extension'}</button> : null}
        {actionMode.connectLabel && canDirectConnect ? <button type="button" data-testid={providerId === 'shopify' ? 'open-connect-shopify-modal' : undefined} onClick={() => setDialog(providerId === 'shipbob' ? 'shipbob' : isLocal ? 'local' : 'connect')} style={button}>{actionMode.connectLabel} {providerName}</button> : null}
        {providerId === 'shopify' && !actionMode.connectLabel ? <button type="button" data-testid="reconnect-shopify" onClick={() => setDialog('connect')} style={button}>Reconnect Shopify</button> : null}
        {actionMode.connectLabel && !canDirectConnect && setupWithReturn ? <Link href={setupWithReturn} style={{ ...button, textDecoration: 'none' }}>{actionMode.connectLabel} {providerName}</Link> : null}
        {actionMode.syncLabel ? <button type="button" disabled={Boolean(busy)} onClick={() => void sync()} style={button}>{busy === 'sync' ? 'Syncing…' : actionMode.syncLabel}</button> : null}
        {actionMode.mode === 'sync_pending' ? <span role="status" style={{ alignSelf: 'center', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>sync in progress</span> : null}
        {providerId === 'zendesk' ? <><a href="/downloads/unauth-zendesk-app.zip" download style={{ ...secondaryButton, textDecoration: 'none' }}>Download Zendesk app</a><button type="button" disabled={Boolean(busy)} onClick={() => void verifyZendesk()} style={secondaryButton}>{busy === 'verify' ? 'Verifying…' : 'Verify install'}</button></> : null}
        {connected && isSupport && providerId !== 'zendesk' ? <button type="button" disabled={Boolean(busy)} onClick={() => void rotateSecret()} style={secondaryButton}>{busy === 'rotate' ? 'Rotating…' : 'Rotate webhook secret'}</button> : null}
        {actionMode.showManage && setupWithReturn ? <Link href={setupWithReturn} style={{ ...secondaryButton, textDecoration: 'none' }}>Manage connection</Link> : null}
        {actionMode.showDisconnect ? <button type="button" onClick={() => setDialog('disconnect')} style={secondaryButton}>Disconnect</button> : null}
      </div>

      {dialog === 'connect' && providerId === 'shopify' ? <SyncStatusConnectModal initialValue={account} onClose={closeDialog} /> : null}
      {dialog === 'connect' && providerId !== 'shopify' ? <ModalBoundary title={`${actionMode.connectLabel ?? 'Connect'} ${providerName}`} description="Credentials are verified before encrypted storage." busy={Boolean(busy)} onClose={closeDialog} actions={<button type="submit" form="provider-connect-form" disabled={connectDisabled || Boolean(busy)} style={{ ...button, background: connectDisabled ? '#f2f0ed' : '#1c1f23', color: connectDisabled ? '#64686d' : '#fff' }}>{busy === 'connect' ? 'Verifying…' : 'Verify and connect'}</button>}><form id="provider-connect-form" onSubmit={(event) => void connect(event)} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f4f3f1', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>{providerId === 'shopify' ? 'Unauth requests read-only commerce and fulfilment scopes. Write access is never requested.' : 'The credential is sent only to the named provider for verification, then stored encrypted. It is not shown again.'}</div>
        <Field label={providerId === 'shopify' ? 'Shopify Admin URL' : providerId === 'zendesk' ? 'Zendesk subdomain' : providerId === 'gorgias' ? 'Account ID or domain' : isCarrier ? 'Client ID' : 'Provider domain'}><input value={account} onChange={(event) => setAccount(event.target.value)} autoComplete="off" placeholder={providerId === 'shopify' ? 'admin.shopify.com/store/your-store' : providerId === 'zendesk' ? 'yourbrand' : undefined} style={field}/></Field>
        {isSupport ? <Field label="Display name (optional)"><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} style={field}/></Field> : null}
        {providerId === 'gorgias' || providerId === 'zendesk' ? <Field label={providerId === 'gorgias' ? 'API user email' : 'Agent email'}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" style={field}/></Field> : null}
        {providerId !== 'shopify' ? <Field label={providerId === 'freshdesk' || providerId === 'zendesk' ? 'API token' : isCarrier ? 'Client secret' : 'API key'}><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" style={field}/></Field> : null}
        {isCarrier ? <><Field label="Shipper account number (optional)"><input type="password" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} autoComplete="off" style={field}/></Field><Field label="Environment"><select value={environment} onChange={(event) => setEnvironment(event.target.value as 'sandbox' | 'production')} style={field}><option value="production">Production</option><option value="sandbox">Sandbox</option></select></Field></> : null}
      </form></ModalBoundary> : null}

      {dialog === 'shipbob' ? <ModalBoundary title={`${actionMode.connectLabel ?? 'Connect'} ${providerName}`} description="Choose the ShipBob account environment before authorising access." busy={Boolean(busy)} onClose={closeDialog} actions={<button type="button" onClick={() => router.push(`/api/integrations/shipbob/install?environment=${environment}`)} style={button}>Continue to ShipBob</button>}><Field label="Environment"><select value={environment} onChange={(event) => setEnvironment(event.target.value as 'sandbox' | 'production')} style={field}><option value="production">Production</option><option value="sandbox">Sandbox</option></select></Field><div style={{ marginTop: 11, padding: '10px 12px', borderRadius: 10, background: '#f4f3f1', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>You leave Unauth for ShipBob to approve access. No financial value changes; the result and actor are audited.</div></ModalBoundary> : null}

      {dialog === 'local' ? <ModalBoundary title={`Enable ${providerName}`} description="Enable local staff-confirmed pack evidence for this workspace." busy={Boolean(busy)} onClose={closeDialog} actions={<button type="button" disabled={Boolean(busy)} onClick={() => void connect()} style={button}>{busy === 'connect' ? 'Enabling…' : 'Enable local source'}</button>}><div style={{ padding: '10px 12px', borderRadius: 10, background: '#f4f3f1', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>This records a workspace capability and makes no provider or OAuth request. It does not prove any pack event or import records.</div></ModalBoundary> : null}

      {dialog === 'disconnect' ? <ModalBoundary title={`Disconnect ${providerName}`} description="New imports and webhooks stop. Canonical records, evidence and audit history remain available." busy={Boolean(busy)} onClose={closeDialog} actions={<button type="button" disabled={confirmation !== providerName.toUpperCase() || Boolean(busy)} onClick={() => void disconnect()} style={{ ...button, background: confirmation === providerName.toUpperCase() ? '#b0431a' : '#f2f0ed', color: confirmation === providerName.toUpperCase() ? '#fff' : '#64686d' }}>{busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}</button>}><div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}><div style={{ padding: '10px 12px', borderRadius: 10, background: '#fdf0e6', font: "400 11.5px/1.5 'Inter',sans-serif", color: '#b0431a' }}>{isLocal ? 'No external provider exists for this local capability. ' : ''}Existing case decisions and source provenance are never deleted. Source freshness becomes unavailable, not zero.</div><Field label={`Type ${providerName.toUpperCase()} to confirm`}><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" style={field}/></Field></div></ModalBoundary> : null}
    </section>
  );
}
