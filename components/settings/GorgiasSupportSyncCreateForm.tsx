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
  background: '#f4f3f1',
  border: '1px solid #e4e3e0',
  color: '#1c1f23',
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
            src="/providers/gorgias.png"
            alt="Gorgias"
            width={40}
            height={40}
            className="h-9 w-9 rounded-[8px] border border-[#eae8e5] object-contain p-1"
          />
          <div>
            <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
              Connect Gorgias
            </p>
            <p className="text-[11.5px] leading-[1.45] text-[#64686d]" style={{ color: '#64686d' }}>
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
            className="text-[11px] font-medium leading-4 text-[#64686d] block mb-1.5"
            style={{ color: '#1c1f23' }}
          >
            Gorgias account domain
          </label>
          <input
            id="gorgias-account-domain"
            required
            className="h-8 w-full rounded-[8px] px-3 text-[length:11.5px] outline-none"
            style={INPUT_STYLE}
            placeholder="acme or acme.gorgias.com"
            value={state.accountOrDomain}
            onChange={(e) => onPatch({ accountOrDomain: e.target.value })}
            disabled={!canManage || state.busy}
          />
          {isCreate ? (
            <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1.5" style={{ color: '#64686d' }}>
              Your Gorgias subdomain — if your URL is <code>acme.gorgias.com</code>, enter <code>acme</code>.
            </p>
          ) : null}
        </div>

        {/* Display name — only on create */}
        {isCreate ? (
          <div>
            <label
              htmlFor="gorgias-display-name"
              className="text-[11px] font-medium leading-4 text-[#64686d] block mb-1.5"
              style={{ color: '#1c1f23' }}
            >
              Display name <span style={{ color: '#64686d' }}>(optional)</span>
            </label>
            <input
              id="gorgias-display-name"
              className="h-8 w-full rounded-[8px] px-3 text-[length:11.5px] outline-none"
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
            className="font-medium text-[13px] leading-5 text-[#1c1f23] inline-flex h-8 items-center rounded-[8px] px-3 disabled:opacity-50"
            style={{ background: '#9f4f08', color: '#fff' }}
          >
            {state.busy ? 'Connecting…' : submitLabel}
          </button>
          {isCreate && !canManage ? (
            <p className="text-[11.5px] leading-[1.45] text-[#64686d]" style={{ color: '#64686d' }}>
              Manage settings permission required.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
