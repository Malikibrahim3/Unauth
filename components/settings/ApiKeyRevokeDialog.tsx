"use client";

import type { ApiKeyRow } from "@/components/settings/apiIntegrationsTypes";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ApiKeyRevokeDialogProps = {
  open: boolean;
  revokeTarget: ApiKeyRow | null;
  busyId: string | null;
  error?: string | null;
  onClose: () => void;
  onRevoke: (key: ApiKeyRow) => void;
};

export function ApiKeyRevokeDialog({
  open,
  revokeTarget,
  busyId,
  error,
  onClose,
  onRevoke,
}: ApiKeyRevokeDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revoke API key?"
      description="This action takes effect immediately and cannot be undone."
      size="sm"
      overlayId="revoke-api-key"
      closeOnBackdrop={!busyId}
      closeOnEscape={!busyId}
      showCloseButton={!busyId}
    >
      {revokeTarget ? (
        <>
          <p className="text-sm" style={{ color: "var(--uo-route-text-secondary)" }}>
            Integrations using <strong>{revokeTarget.name}</strong> (
            {revokeTarget.key_prefix}) will stop working immediately.
          </p>
          <dl className="mt-4 grid gap-3 rounded-[var(--uo-route-radius-surface)] bg-[var(--uo-route-surface-secondary)] p-3">
            <div><dt className="ua-text-metadata">Scope</dt><dd className="ua-text-body mt-1">{revokeTarget.scopes.length ? revokeTarget.scopes.join(', ') : 'No machine scopes'}</dd></div>
            <div><dt className="ua-text-metadata">Recovery</dt><dd className="ua-text-body mt-1">None. Create a new key and update the integration.</dd></div>
            <div><dt className="ua-text-metadata">Audit result</dt><dd className="ua-text-body mt-1">The key remains in history with its revoked state and prior use.</dd></div>
          </dl>
          {error ? <p role="alert" className="mt-4 rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-critical-border)] bg-[var(--uo-route-critical-bg)] px-3 py-2 text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-critical)]">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={Boolean(busyId)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={busyId === revokeTarget.id}
              onClick={() => onRevoke(revokeTarget)}
            >
              Revoke key
            </Button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}
