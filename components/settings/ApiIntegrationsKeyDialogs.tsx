'use client';

import { KeyRound, Trash2 } from 'lucide-react';
import { Bone } from '@/components/ui/LoadingSkeleton';

function ApiKeysSkeleton() {
  return (
    <div className="divide-y" style={{ borderColor: 'var(--ua-border-default)' }} aria-busy="true">
      {[1, 2].map((i) => (
        <div key={i} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="space-y-1.5 min-w-0">
            <Bone className="h-3.5 w-40" />
            <Bone className="h-3 w-32" />
            <Bone className="h-3 w-56" />
          </div>
          <Bone className="h-8 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}
import type { ApiKeyRow } from '@/components/settings/apiIntegrationsTypes';
import { formatIntegrationDate } from '@/components/settings/apiIntegrationsFormat';

type ApiKeysListSectionProps = {
  keys: ApiKeyRow[];
  loading: boolean;
  keysError: string | null;
  busyId: string | null;
  onOpenCreateModal: () => void;
  onOpenRevokeModal: (key: ApiKeyRow) => void;
};

export function ApiKeysListSection({
  keys,
  loading,
  keysError,
  busyId,
  onOpenCreateModal,
  onOpenRevokeModal,
}: ApiKeysListSectionProps) {
  return (
    <section
      className="rounded-md border"
      style={{ borderColor: 'var(--ua-border-default)', background: 'var(--ua-surface-primary)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--ua-border-default)' }}>
        <div>
          <h2 className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>API keys</h2>
          <p className="ua-text-caption-role mt-1">
            Authenticate public API requests with{' '}
            <code className="ua-text-dense">Authorization: Bearer unauth_sk_…</code>
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="ua-text-working-title inline-flex items-center gap-2 rounded-md px-3 py-2"
          style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
        >
          <KeyRound className="h-4 w-4" />
          Create new API key
        </button>
      </div>

      {loading ? (
        <ApiKeysSkeleton />
      ) : keysError ? (
        <p className="ua-text-body px-5 py-8" style={{ color: 'var(--ua-risk-critical)' }}>{keysError}</p>
      ) : keys.length === 0 ? (
        <p className="ua-text-body px-5 py-8" style={{ color: 'var(--ua-text-secondary)' }}>
          No API keys yet. Create one for custom API integrations.
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--ua-border-default)' }}>
          {keys.map((key) => (
            <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="ua-text-working-title" style={{ color: 'var(--ua-text-primary)' }}>{key.name}</p>
                <p className="ua-text-dense mt-1 font-mono" style={{ color: 'var(--ua-text-secondary)' }}>{key.key_prefix}</p>
                <p className="ua-text-caption-role mt-1">
                  Created {formatIntegrationDate(key.created_at)} · Last used {formatIntegrationDate(key.last_used_at)} ·{' '}
                  {key.rate_limit_per_minute}/min
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === key.id}
                onClick={() => onOpenRevokeModal(key)}
                className="ua-text-label inline-flex items-center gap-1 rounded-md border px-3 py-2 disabled:opacity-50"
                style={{ borderColor: 'var(--ua-border-default)', color: 'var(--ua-text-primary)' }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
