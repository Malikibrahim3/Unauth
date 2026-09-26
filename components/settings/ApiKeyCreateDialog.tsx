"use client";

import { Copy } from "lucide-react";
import type { FormEvent } from "react";
import type { ApiIntegrationsState } from "@/components/settings/apiIntegrationsReducer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from '@/components/ui/Select';
import {
  API_RATE_LIMITS_PER_MINUTE,
  API_SCOPES,
  API_SCOPE_LABELS,
  type ApiRateLimit,
  type ApiScope,
} from '@/lib/api/accessPolicy';

type ApiKeyCreateDialogProps = {
  open: boolean;
  state: ApiIntegrationsState;
  onClose: () => void;
  onCreate: (event: FormEvent) => void;
  onCopySecret: () => void;
  onCopyWidgetToken: () => void;
  onKeyNameChange: (value: string) => void;
  onScopesChange: (scopes: ApiScope[]) => void;
  onRateLimitChange: (rateLimit: ApiRateLimit) => void;
};

export function ApiKeyCreateDialog({
  open,
  state,
  onClose,
  onCreate,
  onCopySecret,
  onCopyWidgetToken,
  onKeyNameChange,
  onScopesChange,
  onRateLimitChange,
}: ApiKeyCreateDialogProps) {
  return (
    <Modal
      open={open}
      onClose={state.creating ? () => {} : onClose}
      title={state.createdSecret ? "Save your credentials" : "Create API key"}
      description={
        state.createdSecret
          ? "Save these now. You won't be able to see them again."
          : "Create a named credential so access can be identified and revoked independently."
      }
      size="sm"
      closeOnBackdrop={!state.createdSecret && !state.creating}
      closeOnEscape={!state.createdSecret && !state.creating}
      showCloseButton={!state.createdSecret && !state.creating}
      overlayId="create-reveal-and-revoke-api-key-modals"
    >
      {state.createdSecret ? (
        <>
          <p
            className="text-[11px] font-medium leading-4 text-[#64686d]"
            style={{ color: "#64686d" }}
          >
            API Key (for Chrome, Zendesk, direct API)
          </p>
          <pre
            className="text-[12px] leading-[1.45] text-[#40454a] mt-2 overflow-x-auto rounded-md p-3"
            style={{ background: "#f4f3f1", color: "#1c1f23" }}
          >
            {state.createdSecret}
          </pre>
          {state.createdWidgetToken ? (
            <>
              <p
                className="text-[11px] font-medium leading-4 text-[#64686d] mt-4"
                style={{ color: "#64686d" }}
              >
                Widget Token (for Gorgias widget URL only)
              </p>
              <pre
                className="text-[12px] leading-[1.45] text-[#40454a] mt-2 overflow-x-auto rounded-md p-3"
                style={{ background: "#f4f3f1", color: "#1c1f23" }}
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
              I saved these credentials
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={onCreate}>
          <label
            className="text-[11px] font-medium leading-4 text-[#64686d] block"
            style={{ color: "#64686d" }}
          >
            Label
            <input
              type="text"
              required
              maxLength={120}
              value={state.keyName}
              onChange={(e) => onKeyNameChange(e.target.value)}
              placeholder="e.g. Gorgias integration"
              className="text-[13px] leading-5 text-[#40454a] mt-1 w-full rounded-md px-3 py-2"
              style={{
                background: "#f4f3f1",
                border: "1px solid #e4e3e0",
                color: "#1c1f23",
              }}
            />
          </label>
          <fieldset className="mt-5 grid gap-2">
            <legend className="text-[11px] font-medium leading-4 text-[#64686d] text-[#64686d]">Scopes</legend>
            <p className="text-[11.5px] leading-[1.45] text-[#64686d]">Select only the object families this credential needs.</p>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {API_SCOPES.map((scope) => (
                <label key={scope} className="flex min-w-0 items-start gap-2 rounded-[8px] border border-[#eae8e5] p-2.5">
                  <input
                    type="checkbox"
                    checked={state.scopes.includes(scope)}
                    onChange={(event) => onScopesChange(event.target.checked
                      ? [...state.scopes, scope]
                      : state.scopes.filter((value) => value !== scope))}
                  />
                  <span className="min-w-0"><strong className="block break-words text-[length:11.5px]">{scope}</strong><small className="block break-words text-[#6f6a63]">{API_SCOPE_LABELS[scope]}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="api-key-rate-limit" className="text-[11px] font-medium leading-4 text-[#64686d] mt-5 block text-[#64686d]">
            Per-minute request limit
            <Select
              id="api-key-rate-limit"
              className="mt-1"
              value={state.rateLimitPerMinute}
              onChange={(event) => onRateLimitChange(Number(event.target.value) as ApiRateLimit)}
            >
              {API_RATE_LIMITS_PER_MINUTE.map((limit) => <option value={limit} key={limit}>{limit} requests per minute</option>)}
            </Select>
          </label>
          {state.message?.type === "error" ? (
            <p
              role="alert"
              className="text-[13px] leading-5 text-[#40454a] mt-3 rounded-[8px] border border-[#edc6b5] bg-[#fdf0e6] px-3 py-2 text-[#b0431a]"
            >
              {state.message.text}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-medium leading-4 text-[#64686d] rounded-md border px-3 py-2"
              style={{ borderColor: "#e4e3e0", color: "#1c1f23" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={state.creating || !state.keyName.trim() || state.scopes.length === 0}
              className="font-medium text-[13px] leading-5 text-[#1c1f23] rounded-md px-3 py-2 disabled:opacity-50"
              style={{ background: "#9f4f08", color: "#fff" }}
            >
              {state.creating ? "Creating…" : "Create key"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
