'use client';

import type { CSSProperties, FormEvent } from 'react';
import { FreshdeskCredentialFields } from '@/components/settings/FreshdeskCredentialFields';
import type { FreshdeskSupportSyncState } from '@/components/settings/freshdeskSupportSyncReducer';

type Props = {
  canManage: boolean;
  state: FreshdeskSupportSyncState;
  onPatch: (patch: Partial<FreshdeskSupportSyncState>) => void;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
  variant: 'create' | 'reconnect';
};

const INPUT_STYLE: CSSProperties = {
  background: '#f4f3f1',
  border: '1px solid #e4e3e0',
  color: '#1c1f23',
};

export function FreshdeskSupportSyncCreateForm({
  canManage,
  state,
  onPatch,
  onSubmit,
  submitLabel,
  variant,
}: Props) {
  const isCreate = variant === 'create';

  return (
    <form onSubmit={onSubmit} className={isCreate ? 'space-y-4' : 'space-y-3'}>
      <div>
        {isCreate ? (
          <label
            htmlFor="freshdesk-domain"
            className="text-[11px] font-medium leading-4 text-[#64686d] block mb-1"
            style={{ color: '#64686d' }}
          >
            Freshdesk domain
          </label>
        ) : null}
        <input
          id={isCreate ? 'freshdesk-domain' : undefined}
          required
          aria-label="Freshdesk domain"
          className="text-[13px] leading-5 text-[#40454a] w-full rounded-md px-3 py-2"
          style={INPUT_STYLE}
          placeholder={isCreate ? 'acme or acme.freshdesk.com' : 'Domain'}
          value={state.domain}
          onChange={(e) => onPatch({ domain: e.target.value })}
          disabled={!canManage || state.busy}
        />
        {isCreate ? (
          <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-2" style={{ color: '#64686d' }}>
            Your Freshdesk subdomain. If you log in at <code>acme.freshdesk.com</code>, enter{' '}
            <code>acme</code> or the full host.
          </p>
        ) : null}
      </div>

      {isCreate ? (
        <div>
          <label
            htmlFor="freshdesk-display-name"
            className="text-[11px] font-medium leading-4 text-[#64686d] block mb-1"
            style={{ color: '#64686d' }}
          >
            Display name (optional)
          </label>
          <input
            id="freshdesk-display-name"
            className="text-[13px] leading-5 text-[#40454a] w-full rounded-md px-3 py-2"
            style={INPUT_STYLE}
            placeholder="Support team"
            value={state.displayName}
            onChange={(e) => onPatch({ displayName: e.target.value })}
            disabled={!canManage || state.busy}
          />
        </div>
      ) : null}

      <FreshdeskCredentialFields
        required
        canManage={canManage}
        busy={state.busy}
        freshdeskApiKey={state.freshdeskApiKey}
        showCredHelp={state.showCredHelp}
        onApiKeyChange={(value) => onPatch({ freshdeskApiKey: value })}
        onToggleCredHelp={() => onPatch({ showCredHelp: !state.showCredHelp })}
      />

      <button
        type="submit"
        disabled={!canManage || state.busy}
        className="font-medium text-[13px] leading-5 text-[#1c1f23] rounded-md px-4 py-2 disabled:opacity-60"
        style={{ background: '#9f4f08', color: '#fff' }}
      >
        {state.busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
