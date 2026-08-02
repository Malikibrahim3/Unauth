'use client';

import type { CSSProperties, FormEvent } from 'react';
import { GorgiasCredentialFields } from '@/components/settings/GorgiasCredentialFields';
import type { GorgiasSupportSyncState } from '@/components/settings/gorgiasSupportSyncReducer';
import Image from 'next/image';

type Props = {
  canManage: boolean;
  state: GorgiasSupportSyncState;
  onPatch: (patch: Partial<GorgiasSupportSyncState>) => void;
  onSubmit: (event: FormEvent) => void;
  submitLabel: string;
  variant: 'create' | 'reconnect';
};

const INPUT_STYLE: CSSProperties = {
  background: 'var(--ua-surface-secondary)',
  border: '1px solid var(--ua-border-default)',
  color: 'var(--ua-text-primary)',
};

export function GorgiasSupportSyncCreateForm({
  canManage,
  state,
  onPatch,
  onSubmit,
  submitLabel,
  variant,
}: Props) {
  const isCreate = variant === 'create';

  return (
    <div className="space-y-3">
      {/* Integration header — only on create */}
      {isCreate ? (
        <div className="flex items-center gap-3">
          <Image
            src="/integrations/gorgias.png"
            alt="Gorgias"
            width={40}
            height={40}
            className="h-9 w-9 rounded-[var(--ua-radius-control)] border border-[var(--ua-border-subtle)] object-contain p-1"
          />
          <div>
            <p className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>
              Connect Gorgias
            </p>
            <p className="ua-text-caption-role" style={{ color: 'var(--ua-text-secondary)' }}>
              Registers the sidebar widget and ticket webhook automatically.
            </p>
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-3">
        {/* Account domain */}
        <div>
          <label
            htmlFor="gorgias-account-domain"
            className="ua-text-label block mb-1.5"
            style={{ color: 'var(--ua-text-primary)' }}
          >
            Gorgias account domain
          </label>
          <input
            id="gorgias-account-domain"
            required
            className="h-8 w-full rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-caption-size)] outline-none"
            style={INPUT_STYLE}
            placeholder="acme or acme.gorgias.com"
            value={state.accountOrDomain}
            onChange={(e) => onPatch({ accountOrDomain: e.target.value })}
            disabled={!canManage || state.busy}
          />
          {isCreate ? (
            <p className="ua-text-caption-role mt-1.5" style={{ color: 'var(--ua-text-secondary)' }}>
              Your Gorgias subdomain — if your URL is <code>acme.gorgias.com</code>, enter <code>acme</code>.
            </p>
          ) : null}
        </div>

        {/* Display name — only on create */}
        {isCreate ? (
          <div>
            <label
              htmlFor="gorgias-display-name"
              className="ua-text-label block mb-1.5"
              style={{ color: 'var(--ua-text-primary)' }}
            >
              Display name <span style={{ color: 'var(--ua-text-secondary)' }}>(optional)</span>
            </label>
            <input
              id="gorgias-display-name"
              className="h-8 w-full rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-caption-size)] outline-none"
              style={INPUT_STYLE}
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

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={(!canManage && isCreate) || state.busy}
            className="ua-text-working-title inline-flex h-8 items-center rounded-[var(--ua-radius-control)] px-3 disabled:opacity-50"
            style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
          >
            {state.busy ? 'Connecting…' : submitLabel}
          </button>
          {isCreate && !canManage ? (
            <p className="ua-text-caption-role" style={{ color: 'var(--ua-text-secondary)' }}>
              Manage settings permission required.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
