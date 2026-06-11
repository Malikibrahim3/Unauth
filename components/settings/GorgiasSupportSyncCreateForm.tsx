'use client';

import type { CSSProperties, FormEvent } from 'react';
import { GorgiasCredentialFields } from '@/components/settings/GorgiasCredentialFields';
import type { GorgiasSupportSyncState } from '@/components/settings/gorgiasSupportSyncReducer';

type GorgiasSupportSyncCreateFormProps = {
  canManage: boolean;
  state: GorgiasSupportSyncState;
  onPatch: (patch: Partial<GorgiasSupportSyncState>) => void;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
  variant: 'create' | 'reconnect';
};

const GORGIAS_INPUT_STYLE: CSSProperties = {
  background: 'var(--bg-inset)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
};

export function GorgiasSupportSyncCreateForm({
  canManage,
  state,
  onPatch,
  onSubmit,
  submitLabel,
  variant,
}: GorgiasSupportSyncCreateFormProps) {
  const isCreate = variant === 'create';

  return (
    <form onSubmit={onSubmit} className={isCreate ? 'space-y-4' : 'space-y-3'}>
      <div>
        {isCreate ? (
          <label
            htmlFor="gorgias-account-domain"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Gorgias account ID or account domain
          </label>
        ) : null}
        <input
          id={isCreate ? 'gorgias-account-domain' : undefined}
          required
          aria-label="Gorgias account ID or account domain"
          className="w-full rounded-md px-3 py-2 text-sm"
          style={GORGIAS_INPUT_STYLE}
          placeholder={isCreate ? 'acme or acme.gorgias.com' : 'Account ID or domain'}
          value={state.accountOrDomain}
          onChange={(e) => onPatch({ accountOrDomain: e.target.value })}
          disabled={!canManage || state.busy}
        />
        {isCreate ? (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            This is your Gorgias subdomain - found in your browser URL when logged into Gorgias. If your URL is{' '}
            <code>acme.gorgias.com</code>, enter <code>acme</code> or <code>acme.gorgias.com</code>.
          </p>
        ) : null}
      </div>
      {isCreate ? (
        <div>
          <label
            htmlFor="gorgias-display-name"
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Display name (optional)
          </label>
          <input
            id="gorgias-display-name"
            className="w-full rounded-md px-3 py-2 text-sm"
            style={GORGIAS_INPUT_STYLE}
            placeholder="Acme Gorgias"
            value={state.displayName}
            onChange={(e) => onPatch({ displayName: e.target.value })}
            disabled={!canManage || state.busy}
          />
        </div>
      ) : null}
      <GorgiasCredentialFields
        required
        canManage={canManage}
        busy={state.busy}
        gorgiasApiEmail={state.gorgiasApiEmail}
        gorgiasApiKey={state.gorgiasApiKey}
        showCredHelp={state.showCredHelp}
        onEmailChange={(value) => onPatch({ gorgiasApiEmail: value })}
        onApiKeyChange={(value) => onPatch({ gorgiasApiKey: value })}
        onToggleCredHelp={() => onPatch({ showCredHelp: !state.showCredHelp })}
      />
      {isCreate ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Registers the Unauth sidebar widget and ticket webhook in Gorgias automatically using your REST API
          credentials. If the domain cannot be resolved, you will be given a one-time secret to configure the
          webhook manually.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={(!canManage && isCreate) || state.busy}
        className="inline-flex rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
        style={{ background: 'var(--accent)', color: 'white' }}
      >
        {state.busy ? 'Connecting…' : submitLabel}
      </button>
      {isCreate && !canManage ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          You need manage settings permission to create a connection.
        </p>
      ) : null}
    </form>
  );
}
