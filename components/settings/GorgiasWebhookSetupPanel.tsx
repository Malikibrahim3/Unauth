'use client';

import { Check, Copy } from 'lucide-react';
import type { GorgiasEphemeralSecret, GorgiasSupportSyncState } from '@/components/settings/gorgiasSupportSyncReducer';

type GorgiasWebhookSetupPanelProps = {
  secret: GorgiasEphemeralSecret;
  canManage: boolean;
  copiedField: GorgiasSupportSyncState['copiedField'];
  onCopy: (field: string, value: string) => void;
  onDismiss: () => void;
};

export function GorgiasWebhookSetupPanel({
  secret,
  canManage,
  copiedField,
  onCopy,
  onDismiss,
}: GorgiasWebhookSetupPanelProps) {
  return (
    <div
      className="rounded-lg border p-5 space-y-4"
      style={{
        borderColor: 'var(--surface-border)',
        background: 'var(--surface-raised)',
      }}
    >
      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        One-time webhook setup
      </p>
      <p className="text-sm" style={{ color: 'var(--warning, #b45309)' }}>
        {secret.warning}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        This secret is shown once. If lost, rotate it.
      </p>

      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
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
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
            Header name
          </p>
          <code className="text-xs" style={{ color: 'var(--text)' }}>
            {secret.headerName}
          </code>
        </div>

        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
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
            style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
          >
            {copiedField === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedField === 'secret' ? 'Copied' : 'Copy secret'}
          </button>
        </div>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-sm" style={{ color: 'var(--text-muted)' }}>
        <li>
          Log into Gorgias → click <strong>Settings</strong> in the left sidebar → click{' '}
          <strong>Apps &amp; Plugins</strong> → click <strong>HTTP Integration</strong> → click{' '}
          <strong>Add HTTP Integration</strong>.
        </li>
        <li>
          In the <strong>URL</strong> field, paste the webhook URL above.
        </li>
        <li>
          Set the <strong>Request type</strong> (method) to <strong>POST</strong>.
        </li>
        <li>
          Under <strong>Headers</strong>, add a new header: set the name to{' '}
          <code>{secret.headerName}</code> and the value to the secret you copied above.
        </li>
        <li>
          Still under Headers, add a second header: name <code>x-gorgias-account-id</code> with your numeric
          Gorgias account ID as the value (visible in your Gorgias URL, e.g. <code>12345</code>).
        </li>
        <li>
          Click <strong>Save</strong>, then use the <strong>Send test</strong> button to confirm Unauth receives
          the event.
        </li>
      </ol>

      <button
        type="button"
        onClick={onDismiss}
        className="text-xs underline"
        style={{ color: 'var(--text-muted)' }}
      >
        I saved the secret - hide this panel
      </button>
    </div>
  );
}
