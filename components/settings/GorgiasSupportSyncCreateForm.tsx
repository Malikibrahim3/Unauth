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
            className="h-9 w-9 rounded-[var(--ua-radius-input)] border border-[var(--border-muted)] object-contain p-1"
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Connect Gorgias
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
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
            className="block text-xs font-medium mb-1.5"
            style={{ color: 'var(--text)' }}
          >
            Gorgias account domain
          </label>
          <input
            id="gorgias-account-domain"
            required
            className="h-8 w-full rounded-[var(--ua-radius-input)] px-3 text-[12px] outline-none"
            style={INPUT_STYLE}
            placeholder="acme or acme.gorgias.com"
            value={state.accountOrDomain}
            onChange={(e) => onPatch({ accountOrDomain: e.target.value })}
            disabled={!canManage || state.busy}
          />
          {isCreate ? (
            <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Your Gorgias subdomain — if your URL is <code>acme.gorgias.com</code>, enter <code>acme</code>.
            </p>
          ) : null}
        </div>

        {/* Display name — only on create */}
        {isCreate ? (
          <div>
            <label
              htmlFor="gorgias-display-name"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text)' }}
            >
              Display name <span style={{ color: 'var(--text-secondary)' }}>(optional)</span>
            </label>
            <input
              id="gorgias-display-name"
              className="h-8 w-full rounded-[var(--ua-radius-input)] px-3 text-[12px] outline-none"
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
            className="inline-flex h-8 items-center rounded-[var(--ua-radius-input)] px-3 text-[11px] font-semibold disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {state.busy ? 'Connecting…' : submitLabel}
          </button>
          {isCreate && !canManage ? (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Manage settings permission required.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
