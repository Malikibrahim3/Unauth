'use client';

import type { ApiKeyRow } from '@/components/settings/apiIntegrationsTypes';

type ApiKeyRevokeDialogProps = {
  open: boolean;
  revokeTarget: ApiKeyRow | null;
  busyId: string | null;
  onClose: () => void;
  onRevoke: (key: ApiKeyRow) => void;
};

export function ApiKeyRevokeDialog({
  open,
  revokeTarget,
  busyId,
  onClose,
  onRevoke,
}: ApiKeyRevokeDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Revoke API key"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in srgb, var(--text-primary) 45%, transparent)] p-4"
    >
      <button
        type="button"
        aria-label="Close revoke API key dialog"
        className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-sm rounded-lg border p-6 shadow-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {revokeTarget ? (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Revoke API key?</h3>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Integrations using <strong>{revokeTarget.name}</strong> ({revokeTarget.key_prefix}) will stop working
              immediately.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === revokeTarget.id}
                onClick={() => onRevoke(revokeTarget)}
                className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: 'color-mix(in srgb, var(--success) 12%, transparent)', color: 'var(--text)' }}
              >
                Revoke key
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
