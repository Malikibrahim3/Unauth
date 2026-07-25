"use client";

import { Copy } from "lucide-react";
import type { FormEvent } from "react";
import type { ApiIntegrationsState } from "@/components/settings/apiIntegrationsReducer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

type ApiKeyCreateDialogProps = {
  open: boolean;
  state: ApiIntegrationsState;
  onClose: () => void;
  onCreate: (event: FormEvent) => void;
  onCopySecret: () => void;
  onCopyWidgetToken: () => void;
  onKeyNameChange: (value: string) => void;
};

export function ApiKeyCreateDialog({
  open,
  state,
  onClose,
  onCreate,
  onCopySecret,
  onCopyWidgetToken,
  onKeyNameChange,
}: ApiKeyCreateDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={state.createdSecret ? "Save your credentials" : "Create API key"}
      description={
        state.createdSecret
          ? "Save these now. You won't be able to see them again."
          : "Create a named credential so access can be identified and revoked independently."
      }
      size="sm"
      closeOnBackdrop={!state.createdSecret}
    >
      {state.createdSecret ? (
        <>
          <p
            className="text-xs font-medium"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            API Key (for Chrome, Zendesk, direct API)
          </p>
          <pre
            className="mt-2 overflow-x-auto rounded-md p-3 text-xs"
            style={{ background: "var(--ua-surface-secondary)", color: "var(--ua-text-primary)" }}
          >
            {state.createdSecret}
          </pre>
          {state.createdWidgetToken ? (
            <>
              <p
                className="mt-4 text-xs font-medium"
                style={{ color: "var(--ua-text-secondary)" }}
              >
                Widget Token (for Gorgias widget URL only)
              </p>
              <pre
                className="mt-2 overflow-x-auto rounded-md p-3 text-xs"
                style={{ background: "var(--ua-surface-secondary)", color: "var(--ua-text-primary)" }}
              >
                {state.createdWidgetToken}
              </pre>
            </>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              onClick={onCopySecret}
              className="flex-1 justify-center"
            >
              <Copy className="h-4 w-4" />
              {state.copied ? "Copied" : "Copy API key"}
            </Button>
            {state.createdWidgetToken ? (
              <Button
                type="button"
                variant="secondary"
                onClick={onCopyWidgetToken}
                className="flex-1 justify-center"
              >
                <Copy className="h-4 w-4" />
                Copy widget token
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="justify-center sm:basis-full"
            >
              Close credentials dialog
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={onCreate}>
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--ua-text-primary)" }}
          >
            Create API key
          </h3>
          <label
            className="mt-4 block text-xs font-medium"
            style={{ color: "var(--ua-text-secondary)" }}
          >
            Label
            <input
              type="text"
              required
              maxLength={120}
              value={state.keyName}
              onChange={(e) => onKeyNameChange(e.target.value)}
              placeholder="e.g. Gorgias integration"
              className="mt-1 w-full rounded-md px-3 py-2 text-sm"
              style={{
                background: "var(--ua-surface-secondary)",
                border: "1px solid var(--ua-border-default)",
                color: "var(--ua-text-primary)",
              }}
            />
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "var(--ua-border-default)", color: "var(--ua-text-primary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={state.creating || !state.keyName.trim()}
              className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
              style={{ background: "var(--ua-action-primary)", color: "var(--ua-text-inverse)" }}
            >
              {state.creating ? "Creating…" : "Create key"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
