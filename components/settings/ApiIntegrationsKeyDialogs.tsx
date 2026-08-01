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
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>API keys</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
            Authenticate public API requests with{' '}
            <code className="text-xs">Authorization: Bearer unauth_sk_…</code>
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
          style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
        >
          <KeyRound className="h-4 w-4" />
          Create new API key
        </button>
      </div>

      {loading ? (
        <ApiKeysSkeleton />
      ) : keysError ? (
        <p className="px-5 py-8 text-sm" style={{ color: 'var(--ua-risk-critical)' }}>{keysError}</p>
      ) : keys.length === 0 ? (
        <p className="px-5 py-8 text-sm" style={{ color: 'var(--ua-text-secondary)' }}>
          No API keys yet. Create one for custom API integrations.
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--ua-border-default)' }}>
          {keys.map((key) => (
            <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--ua-text-primary)' }}>{key.name}</p>
                <p className="mt-1 font-mono text-xs" style={{ color: 'var(--ua-text-secondary)' }}>{key.key_prefix}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
                  Created {formatIntegrationDate(key.created_at)} · Last used {formatIntegrationDate(key.last_used_at)} ·{' '}
                  {key.rate_limit_per_minute}/min
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === key.id}
                onClick={() => onOpenRevokeModal(key)}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs disabled:opacity-50"
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
