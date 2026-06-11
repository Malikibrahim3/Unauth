'use client';

import { Check, Copy } from 'lucide-react';
import type { FreshdeskEphemeralSecret } from '@/components/settings/freshdeskSupportSyncReducer';

type FreshdeskWebhookSetupPanelProps = {
  secret: FreshdeskEphemeralSecret;
  canManage: boolean;
  copiedField: string | null;
  onCopy: (field: string, value: string) => void;
  onDismiss: () => void;
};

export function FreshdeskWebhookSetupPanel({
  secret,
  canManage,
  copiedField,
  onCopy,
  onDismiss,
}: FreshdeskWebhookSetupPanelProps) {
  return (
    <div
      className="rounded-md border p-5 space-y-4"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--surface)',
      }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        One-time webhook setup
      </p>
      <p className="text-sm" style={{ color: 'var(--warning)' }}>
        {secret.warning}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        This secret is shown once. If lost, rotate it from the connection settings below.
      </p>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Webhook URL
          </p>
          <pre
            className="overflow-x-auto rounded-md p-3 text-xs"
            style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
          >
            {secret.webhookUrl}
          </pre>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => void onCopy('webhookUrl', secret.webhookUrl)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: 'var(--accent)' }}
          >
            {copiedField === 'webhookUrl' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy webhook URL
          </button>
        </div>

        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Header name (optional)
          </p>
          <code className="text-xs" style={{ color: 'var(--text)' }}>
            {secret.headerName}
          </code>
        </div>

        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Secret value
          </p>
          <pre
            className="overflow-x-auto rounded-md p-3 text-xs font-mono"
            style={{ background: 'var(--bg-inset)', color: 'var(--text)' }}
          >
            {secret.secret}
          </pre>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => void onCopy('secret', secret.secret)}
            className="mt-2 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {copiedField === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedField === 'secret' ? 'Copied' : 'Copy secret'}
          </button>
        </div>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <li>
          In Freshdesk → <strong>Admin</strong> → <strong>Workflows</strong> → <strong>Automations</strong>.
        </li>
        <li>
          Create a rule for <strong>Ticket is created</strong> and another for <strong>Ticket is updated</strong>{' '}
          (or one rule with both events if your plan allows).
        </li>
        <li>
          Add action <strong>Trigger webhook</strong> and paste the webhook URL above.
        </li>
        <li>
          Set method to <strong>POST</strong>. If Freshdesk supports custom headers, add{' '}
          <code>{secret.headerName}</code> with the secret value (the URL also includes the secret for
          compatibility).
        </li>
        <li>Save the automation and create a test ticket to confirm Unauth receives events.</li>
      </ol>

      <button
        type="button"
        onClick={onDismiss}
        className="text-xs underline"
        style={{ color: 'var(--text-secondary)' }}
      >
        I saved the secret - hide this panel
      </button>
    </div>
  );
}
