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
      overlayId={state.createdSecret ? "api-key-one-time-reveal" : "create-api-key"}
    >
      {state.createdSecret ? (
        <>
          <p
            className="ua-text-label"
            style={{ color: "var(--uo-route-text-secondary)" }}
          >
            API Key (for Chrome, Zendesk, direct API)
          </p>
          <pre
            className="ua-text-dense mt-2 overflow-x-auto rounded-md p-3"
            style={{ background: "var(--uo-route-surface-secondary)", color: "var(--uo-route-text-primary)" }}
          >
            {state.createdSecret}
          </pre>
          {state.createdWidgetToken ? (
            <>
              <p
                className="ua-text-label mt-4"
                style={{ color: "var(--uo-route-text-secondary)" }}
              >
                Widget Token (for Gorgias widget URL only)
              </p>
              <pre
                className="ua-text-dense mt-2 overflow-x-auto rounded-md p-3"
                style={{ background: "var(--uo-route-surface-secondary)", color: "var(--uo-route-text-primary)" }}
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
            className="ua-text-label block"
            style={{ color: "var(--uo-route-text-secondary)" }}
          >
            Label
            <input
              type="text"
              required
              maxLength={120}
              value={state.keyName}
              onChange={(e) => onKeyNameChange(e.target.value)}
              placeholder="e.g. Gorgias integration"
              className="ua-text-body mt-1 w-full rounded-md px-3 py-2"
              style={{
                background: "var(--uo-route-surface-secondary)",
                border: "1px solid var(--uo-route-border-default)",
                color: "var(--uo-route-text-primary)",
              }}
            />
          </label>
          <fieldset className="mt-5 grid gap-2">
            <legend className="ua-text-label text-[var(--uo-route-text-secondary)]">Scopes</legend>
            <p className="ua-text-caption-role">Select only the object families this credential needs.</p>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
              {API_SCOPES.map((scope) => (
                <label key={scope} className="flex min-w-0 items-start gap-2 rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-border-subtle)] p-2.5">
                  <input
                    type="checkbox"
                    checked={state.scopes.includes(scope)}
                    onChange={(event) => onScopesChange(event.target.checked
                      ? [...state.scopes, scope]
                      : state.scopes.filter((value) => value !== scope))}
                  />
                  <span className="min-w-0"><strong className="block break-words text-[length:var(--uo-route-text-caption-size)]">{scope}</strong><small className="block break-words text-[var(--uo-route-text-tertiary)]">{API_SCOPE_LABELS[scope]}</small></span>
                </label>
              ))}
            </div>
          </fieldset>
          <label htmlFor="api-key-rate-limit" className="ua-text-label mt-5 block text-[var(--uo-route-text-secondary)]">
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
              className="ua-text-body mt-3 rounded-[var(--uo-route-radius-control)] border border-[var(--uo-route-critical-border)] bg-[var(--uo-route-critical-bg)] px-3 py-2 text-[var(--uo-route-critical)]"
            >
              {state.message.text}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="ua-text-label rounded-md border px-3 py-2"
              style={{ borderColor: "var(--uo-route-border-default)", color: "var(--uo-route-text-primary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={state.creating || !state.keyName.trim() || state.scopes.length === 0}
              className="ua-text-working-title rounded-md px-3 py-2 disabled:opacity-50"
              style={{ background: "var(--uo-route-action-primary)", color: "var(--uo-route-text-inverse)" }}
            >
              {state.creating ? "Creating…" : "Create key"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
