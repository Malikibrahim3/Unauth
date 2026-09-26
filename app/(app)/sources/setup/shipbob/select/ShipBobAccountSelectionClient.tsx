'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';

type Account = { id: string; name: string | null };
type SelectionResponse = { accounts: Account[]; environment: string; expiresAt: string };

export default function ShipBobAccountSelectionClient({ selectionId, returnTo, acceptanceState = null }: { selectionId: string; returnTo: string; acceptanceState?: 'empty' | null }) {
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [submission, setSubmission] = useState<{ status: 'idle' | 'saving' | 'error'; message: string }>({ status: 'idle', message: '' });
  const resource = useFetchJson<SelectionResponse>(acceptanceState ? null : selectionId ? `/api/integrations/shipbob/selection?selection=${encodeURIComponent(selectionId)}` : null, {
    parse: async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Unable to load ShipBob channels.');
      return body as SelectionResponse;
    },
  });
  const accounts = resource.data?.accounts ?? [];
  const visibleAccounts = accounts.filter((account) => `${account.name ?? ''} ${account.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const environment = resource.data?.environment ?? 'production';
  const expiresAt = resource.data?.expiresAt ?? null;
  const effectiveSelected = selected && visibleAccounts.some((account) => account.id === selected) ? selected : visibleAccounts[0]?.id ?? accounts[0]?.id ?? '';
  const invalidSelection = !selectionId && !acceptanceState;
  const status = acceptanceState === 'empty' ? 'ready' : submission.status === 'saving' ? 'saving' : submission.status === 'error' || invalidSelection || resource.status === 'error' ? 'error' : resource.status === 'success' || resource.status === 'refreshing' ? 'ready' : 'loading';
  const message = acceptanceState === 'empty' ? 'The provider returned no selectable channels. No connection was created.' : submission.message || (invalidSelection ? 'This selection link is invalid. Start the ShipBob connection again.' : resource.status === 'error' ? resource.error : resource.isInitialLoading ? 'Discovering ShipBob channels…' : accounts.length === 0 ? 'No ShipBob channels are available for this account.' : '');

  async function submit() {
    if (!effectiveSelected || status !== 'ready') return;
    setSubmission({ status: 'saving', message: 'Connecting the selected channel and starting the initial import…' });
    try {
      const response = await fetch('/api/integrations/shipbob/selection', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ selectionId, accountId: effectiveSelected }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'ShipBob connection failed.');
      window.location.assign(body.redirect);
    } catch (cause) {
      setSubmission({ status: 'error', message: cause instanceof Error ? cause.message : 'ShipBob connection failed.' });
    }
  }

  return (
    <>
      <SetBreadcrumbLabel label="ShipBob · choose a channel" detail="authorisation succeeded · one more choice before any data is read"/>
      <h1 data-reference-ignore="accessibility-heading" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>Choose a ShipBob channel</h1>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px', borderBottom: '1px solid #eae8e5' }}>
        <span style={{ padding: '2px 7px', borderRadius: 5, background: '#fff3e9', font: "500 10px/1.5 'Inter',sans-serif", color: '#7a5310' }}>AUTHORISED · NOT YET CONNECTED</span>
        <span style={{ font: "400 12.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>Your ShipBob account has {formatNumber(accounts.length)} {accounts.length === 1 ? 'channel' : 'channels'}. Unauth reads one, because a fulfilment record from the wrong channel would attach losses to the wrong warehouse.</span>
        <span style={{ flex: 1 }}/>
        <Link href={returnTo} style={{ padding: '6px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', font: "400 12.5px/1 'Inter',sans-serif", color: '#40454a', textDecoration: 'none' }}>Cancel</Link>
        <button type="button" disabled={status !== 'ready' || !effectiveSelected} onClick={() => void submit()} style={{ padding: '6px 11px', border: 0, borderRadius: 9, background: status === 'ready' && effectiveSelected ? '#1c1f23' : '#f2f0ed', color: status === 'ready' && effectiveSelected ? '#fff' : '#64686d', font: "500 12.5px/1 'Inter',sans-serif", cursor: status === 'ready' && effectiveSelected ? 'pointer' : 'not-allowed' }}>{status === 'saving' ? 'Connecting…' : 'Connect this channel'}</button>
      </div>
      <div data-screen-label="Channel select" data-visual-world="supplied-package" data-surface-id="shipbob-channel-selection" data-archetype="P2-single-select-task" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 22px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {accounts.length ? <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)' }}><svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#64686d" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><circle cx="5.6" cy="5.6" r="3.8"/><path d="m8.5 8.5 2.7 2.7"/></svg><span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>Search ShipBob channels</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search channel name or ID" style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', font: "400 12.5px/1.3 'Inter',sans-serif", color: '#1c1f23' }}/></label> : null}
          {visibleAccounts.map((account) => {
            const checked = account.id === effectiveSelected;
            return <label key={account.id} data-selected={checked} style={{ padding: '14px 16px', borderRadius: 10, background: '#fff', boxShadow: checked ? '0 1px 2px rgba(28,27,25,.06),0 0 0 2px rgba(242,118,26,.5)' : '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', opacity: environment === 'sandbox' ? .6 : 1 }}>
              <input type="radio" name="shipbob-channel" value={account.id} checked={checked} onChange={() => setSelected(account.id)} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}/>
              <span style={{ width: 16, height: 16, flex: 'none', borderRadius: '50%', boxShadow: checked ? 'inset 0 0 0 5px #1c1f23' : 'inset 0 0 0 1.5px #ddd8d1' }}/>
              <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><strong style={{ font: "500 13.5px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{account.name ?? 'Unnamed channel'}</strong><span style={{ font: "400 11px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{account.id}</span><span style={{ padding: '2px 7px', borderRadius: 5, background: environment === 'sandbox' ? '#fdf0e6' : '#f4f3f1', font: "500 10px/1.5 'Inter',sans-serif", color: environment === 'sandbox' ? '#b0431a' : '#40454a' }}>{environment.toUpperCase()}</span></span><span style={{ display: 'block', marginTop: 4, font: "400 11.5px/1.5 'Inter',sans-serif", color: '#64686d' }}>Provider channel · activity volume unavailable until connection</span></span>
              <span style={{ flex: 'none', font: "400 10.5px/1.4 'IBM Plex Mono',monospace", color: '#64686d' }}>{expiresAt ? `expires ${formatDateTime(expiresAt)}` : 'expiry unavailable'}</span>
            </label>;
          })}
          {!visibleAccounts.length ? <div data-state-id={status === 'loading' ? 'shipbob-selection-loading' : status === 'error' ? 'shipbob-selection-error' : 'shipbob-selection-empty'} style={{ minHeight: 220, borderRadius: 12, background: '#f4f3f1', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}><div><strong style={{ display: 'block', font: "500 12.5px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>{status === 'loading' ? 'Discovering channels' : accounts.length ? 'No channels match this search' : 'Channel selection unavailable'}</strong><span style={{ display: 'block', marginTop: 4, font: "400 11px/1.5 'Inter',sans-serif", color: '#64686d' }}>{accounts.length ? 'Clear the search to show every returned channel.' : message || 'No accounts were returned by ShipBob.'}</span>{accounts.length ? <button type="button" onClick={() => setQuery('')} style={{ marginTop: 9, ...{ padding: '6px 10px', border: 0, borderRadius: 8, background: '#fff', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.11)', color: '#40454a' } }}>Clear search</button> : null}</div></div> : null}
          {message && accounts.length ? <div role={status === 'error' ? 'alert' : 'status'} style={{ padding: '10px 12px', borderRadius: 10, background: status === 'error' ? '#fdf0e6' : '#fff3e9', color: status === 'error' ? '#b0431a' : '#7a5310', font: "400 11.5px/1.5 'Inter',sans-serif" }}>{message}</div> : null}
          <div style={{ padding: '14px 16px', borderRadius: 12, background: '#f4f3f1' }}><div style={{ font: "500 12.5px/1.4 'Inter',sans-serif", color: '#1c1f23' }}>Choose the channel that owns this workspace’s fulfilments</div><div style={{ marginTop: 5, font: "400 11.5px/1.55 'Inter',sans-serif", color: '#64686d' }}>Unauth cannot infer the correct channel from its name or an empty activity window. The choice can be changed later without deleting already-imported records.</div></div>
        </div>
      </div>
    </>
  );
}
