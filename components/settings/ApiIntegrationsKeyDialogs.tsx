'use client';

import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import styles from '@/components/settings/OperationsSettings.module.css';

function ApiKeysSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <div /><div /><div />
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
      className={styles.card}
      data-operations-surface="api-access"
    >
      <div className={styles.cardHeading}>
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
        <p className={styles.empty} style={{ color: 'var(--uo-route-critical)' }}>{keysError}</p>
      ) : keys.length === 0 ? (
        <p className={styles.empty}>No API keys yet. Create one for an approved export or integration.</p>
      ) : (
        <div className={styles.apiTable} role="table" aria-label="API keys" tabIndex={0}>
          <div role="row" className={styles.apiHeader}><span>Name</span><span>Key</span><span>Scopes</span><span>Rate limit</span><span>Created</span><span>Last used</span><span>Status</span></div>
          {keys.map((key) => <div role="row" className={styles.apiRow} key={key.id}>
            <span className={styles.apiName}>{key.name}</span>
            <span className={styles.apiPrefix}>{key.key_prefix}…</span>
            <span className={styles.apiMuted}>{key.scopes.length ? key.scopes.join(', ') : 'No machine access'}</span>
            <span>{key.rate_limit_per_minute}/minute</span>
            <span>{formatIntegrationDate(key.created_at)}</span>
            <span>{formatIntegrationDate(key.last_used_at)}</span>
            <span>{key.revoked_at ? <span className={styles.apiStatus} data-tone="revoked">Revoked</span> : <button type="button" className={styles.apiStatus} disabled={busyId === key.id} onClick={() => onOpenRevokeModal(key)} title={`Revoke ${key.name}`}>Active · revoke</button>}</span>
          </div>)}
        </div>
      )}
      <p className={styles.tableFootnote}>A revoked key stays in history so its prior use remains readable. Revocation does not remove records already ingested.</p>
    </section>
  );
}
