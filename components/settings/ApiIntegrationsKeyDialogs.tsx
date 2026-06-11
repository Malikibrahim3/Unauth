'use client';

import { KeyRound, Trash2 } from 'lucide-react';

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md ${className ?? ''}`}
      style={{ background: 'var(--bg-subtle, var(--border))' }}
      aria-hidden="true"
    />
  );
}

function ApiKeysSkeleton() {
  return (
    <div className="divide-y" style={{ borderColor: 'var(--border)' }} aria-busy="true">
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
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>API keys</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Authenticate public API requests with{' '}
            <code className="text-xs">Authorization: Bearer unauth_sk_…</code>
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <KeyRound className="h-4 w-4" />
          Create new API key
        </button>
      </div>

      {loading ? (
        <ApiKeysSkeleton />
      ) : keysError ? (
        <p className="px-5 py-8 text-sm" style={{ color: 'var(--risk-critical)' }}>{keysError}</p>
      ) : keys.length === 0 ? (
        <p className="px-5 py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
          No API keys yet. Create one for the Chrome extension or custom API integrations.
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {keys.map((key) => (
            <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{key.name}</p>
                <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{key.key_prefix}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Created {formatIntegrationDate(key.created_at)} · Last used {formatIntegrationDate(key.last_used_at)} ·{' '}
                  {key.rate_limit_per_minute}/min
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === key.id}
                onClick={() => onOpenRevokeModal(key)}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
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
