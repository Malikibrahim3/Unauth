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
      overlayId="create-reveal-and-revoke-api-key-modals"
      closeOnBackdrop={!busyId}
      closeOnEscape={!busyId}
      showCloseButton={!busyId}
    >
      {revokeTarget ? (
        <>
          <p className="text-sm" style={{ color: "#64686d" }}>
            Integrations using <strong>{revokeTarget.name}</strong> (
            {revokeTarget.key_prefix}) will stop working immediately.
          </p>
          <dl className="mt-4 grid gap-3 rounded-[12px] bg-[#f4f3f1] p-3">
            <div><dt className="text-[10.5px] leading-4 text-[#6f6a63]">Scope</dt><dd className="text-[13px] leading-5 text-[#40454a] mt-1">{revokeTarget.scopes.length ? revokeTarget.scopes.join(', ') : 'No machine scopes'}</dd></div>
            <div><dt className="text-[10.5px] leading-4 text-[#6f6a63]">Recovery</dt><dd className="text-[13px] leading-5 text-[#40454a] mt-1">None. Create a new key and update the integration.</dd></div>
            <div><dt className="text-[10.5px] leading-4 text-[#6f6a63]">Audit result</dt><dd className="text-[13px] leading-5 text-[#40454a] mt-1">The key remains in history with its revoked state and prior use.</dd></div>
          </dl>
          {error ? <p role="alert" className="mt-4 rounded-[8px] border border-[#edc6b5] bg-[#fdf0e6] px-3 py-2 text-[length:11.5px] text-[#b0431a]">{error}</p> : null}
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
