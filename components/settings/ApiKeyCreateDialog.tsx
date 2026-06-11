'use client';

import { Copy } from 'lucide-react';
import type { FormEvent } from 'react';
import type { ApiIntegrationsState } from '@/components/settings/apiIntegrationsReducer';

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
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create API key"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in srgb, var(--text-primary) 45%, transparent)] p-4"
    >
      <button
        type="button"
        aria-label="Close create API key dialog"
        className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-lg border p-6 shadow-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {state.createdSecret ? (
          <>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Save your credentials</h3>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Save these now. You won&apos;t be able to see them again.
            </p>
            <p className="mt-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              API Key (for Chrome, Zendesk, direct API)
            </p>
            <pre
              className="mt-2 overflow-x-auto rounded-md p-3 text-xs"
              style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
            >
              {state.createdSecret}
            </pre>
            {state.createdWidgetToken ? (
              <>
                <p className="mt-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Widget Token (for Gorgias widget URL only)
                </p>
                <pre
                  className="mt-2 overflow-x-auto rounded-md p-3 text-xs"
                  style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
                >
                  {state.createdWidgetToken}
                </pre>
              </>
            ) : null}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onCopySecret}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                <Copy className="h-4 w-4" />
                {state.copied ? 'Copied' : 'Copy API key'}
              </button>
              {state.createdWidgetToken ? (
                <button
                  type="button"
                  onClick={onCopyWidgetToken}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm"
                  style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
                >
                  <Copy className="h-4 w-4" />
                  Copy widget token
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                Close credentials dialog
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={onCreate}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Create API key</h3>
            <label className="mt-4 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
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
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                }}
              />
            </label>
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
                type="submit"
                disabled={state.creating || !state.keyName.trim()}
                className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'white' }}
              >
                {state.creating ? 'Creating…' : 'Create key'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
