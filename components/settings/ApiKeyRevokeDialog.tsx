"use client";

import type { ApiKeyRow } from "@/components/settings/apiIntegrationsTypes";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

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
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revoke API key?"
      description="This action takes effect immediately and cannot be undone."
      size="sm"
    >
      {revokeTarget ? (
        <>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Integrations using <strong>{revokeTarget.name}</strong> (
            {revokeTarget.key_prefix}) will stop working immediately.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busyId === revokeTarget.id}
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
