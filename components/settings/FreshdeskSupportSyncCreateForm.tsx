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
  background: 'var(--bg-inset)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
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
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Freshdesk domain
          </label>
        ) : null}
        <input
          id={isCreate ? 'freshdesk-domain' : undefined}
          required
          aria-label="Freshdesk domain"
          className="w-full rounded-md px-3 py-2 text-sm"
          style={INPUT_STYLE}
          placeholder={isCreate ? 'acme or acme.freshdesk.com' : 'Domain'}
          value={state.domain}
          onChange={(e) => onPatch({ domain: e.target.value })}
          disabled={!canManage || state.busy}
        />
        {isCreate ? (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Your Freshdesk subdomain. If you log in at <code>acme.freshdesk.com</code>, enter{' '}
            <code>acme</code> or the full host.
          </p>
        ) : null}
      </div>

      {isCreate ? (
        <div>
          <label
            htmlFor="freshdesk-display-name"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Display name (optional)
          </label>
          <input
            id="freshdesk-display-name"
            className="w-full rounded-md px-3 py-2 text-sm"
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
        className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
        style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
      >
        {state.busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
