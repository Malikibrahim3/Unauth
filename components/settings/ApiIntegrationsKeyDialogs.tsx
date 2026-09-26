'use client';

import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
function ApiKeysSkeleton() {
  return (
    <div style={{ display: 'grid', gap: 8, padding: 14 }} aria-busy="true">
      {[1,2,3].map((item) => <div key={item} style={{ height: 38, borderRadius: 7, background: '#f2f0ed' }} />)}
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
      style={{ overflow: 'hidden', border: '1px solid #e4e3e0', borderRadius: 12, background: '#fff' }}
      data-operations-surface="api-access"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '14px 16px', borderBottom: '1px solid #eae8e5' }}>
        <div>
          <h2>API keys</h2>
          <p>Scopes and rate limits are fixed at creation. Changing them means creating a new key.</p>
        </div>
        <Button
          type="button"
          onClick={onOpenCreateModal}
          leadingIcon={<KeyRound className="h-4 w-4" />}
          size="sm"
        >
          Create a key
        </Button>
      </div>

      {loading ? (
        <ApiKeysSkeleton />
      ) : keysError ? (
        <p style={{ margin: 0, padding: 18, color: '#b0431a', fontSize: 12 }}>{keysError}</p>
      ) : keys.length === 0 ? (
        <p style={{ margin: 0, padding: 18, color: '#64686d', fontSize: 12 }} data-state-id="api-keys-empty">No API keys yet. Create one for an approved export or integration.</p>
      ) : (
        <div style={{ overflowX: 'auto' }} role="table" aria-label="API keys" tabIndex={0}>
          <div role="row" style={rowStyle}><span>Name</span><span>Key</span><span>Scopes</span><span>Rate limit</span><span>Created</span><span>Last used</span><span>Status</span></div>
          {keys.map((key) => <div role="row" style={{ ...rowStyle, minHeight: 46, color: '#40454a' }} key={key.id}>
            <span style={{ color: '#1c1f23', fontWeight: 500 }}>{key.name}</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{key.key_prefix}…</span>
            <span style={{ color: '#6f6a63' }}>{key.scopes.length ? key.scopes.join(', ') : 'No machine access'}</span>
            <span>{key.rate_limit_per_minute}/minute</span>
            <span>{formatIntegrationDate(key.created_at)}</span>
            <span>{formatIntegrationDate(key.last_used_at)}</span>
            <span>{key.revoked_at ? <span style={statusStyle} data-tone="revoked">Revoked</span> : <button type="button" style={statusStyle} disabled={busyId === key.id} onClick={() => onOpenRevokeModal(key)} title={`Revoke ${key.name}`}>Active · revoke</button>}</span>
          </div>)}
        </div>
      )}
      <p style={{ margin: 0, padding: '10px 16px', borderTop: '1px solid #eae8e5', background: '#ffffff', color: '#6f6a63', fontSize: 10.5 }}>A revoked key stays in history so its prior use remains readable. Revocation does not remove records already ingested.</p>
    </section>
  );
}

const rowStyle = { minWidth: 860, display: 'grid', gridTemplateColumns: '1.1fr .75fr 1.4fr .7fr .85fr .85fr .8fr', gap: 12, alignItems: 'center', minHeight: 34, padding: '0 16px', borderBottom: '1px solid #f4f2ef', color: '#6f6a63', fontSize: 10.5 } as const;
const statusStyle = { border: 0, borderRadius: 6, padding: '4px 7px', background: '#f2f0ed', color: '#40454a', fontSize: 10, cursor: 'pointer' } as const;
