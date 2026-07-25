'use client';

import { Check, Copy } from 'lucide-react';
import { Card } from '@/components/ui';
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
    <Card unstyled variant="panel" className="space-y-4 p-5">
      <p className="text-sm font-medium" style={{ color: 'var(--ua-text-primary)' }}>
        One-time webhook setup
      </p>
      <p className="text-sm" style={{ color: 'var(--ua-warning)' }}>
        {secret.warning}
      </p>
      <p className="text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
        This secret is shown once. If lost, rotate it from the connection settings below.
      </p>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--ua-text-secondary)' }}>
            Webhook URL
          </p>
          <pre
            className="overflow-x-auto rounded-md p-3 text-xs"
            style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-primary)' }}
          >
            {secret.webhookUrl}
          </pre>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => void onCopy('webhookUrl', secret.webhookUrl)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium"
            style={{ color: 'var(--ua-action-primary)' }}
          >
            {copiedField === 'webhookUrl' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy webhook URL
          </button>
        </div>

        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--ua-text-secondary)' }}>
            Header name (optional)
          </p>
          <code className="text-xs" style={{ color: 'var(--ua-text-primary)' }}>
            {secret.headerName}
          </code>
        </div>

        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--ua-text-secondary)' }}>
            Secret value
          </p>
          <pre
            className="overflow-x-auto rounded-md p-3 text-xs font-mono"
            style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-primary)' }}
          >
            {secret.secret}
          </pre>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => void onCopy('secret', secret.secret)}
            className="mt-2 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
            style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
          >
            {copiedField === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedField === 'secret' ? 'Copied' : 'Copy secret'}
          </button>
        </div>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm" style={{ color: 'var(--ua-text-secondary)' }}>
        <li>
          In Freshdesk, then <strong>Admin</strong>, then <strong>Workflows</strong>, then <strong>Automations</strong>.
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
        style={{ color: 'var(--ua-text-secondary)' }}
      >
        I saved the secret - hide this panel
      </button>
    </Card>
  );
}
