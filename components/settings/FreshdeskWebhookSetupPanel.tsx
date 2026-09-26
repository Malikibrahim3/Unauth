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
      <p className="text-[13px] leading-5 text-[#40454a] font-medium" style={{ color: '#1c1f23' }}>
        One-time webhook setup
      </p>
      <p className="text-[13px] leading-5 text-[#40454a]" style={{ color: '#7a5310' }}>
        {secret.warning}
      </p>
      <p className="text-[11.5px] leading-[1.45] text-[#64686d]" style={{ color: '#64686d' }}>
        This secret is shown once. If lost, rotate it from the connection settings below.
      </p>

      <div className="space-y-3 text-[13px] leading-5 text-[#40454a]">
        <div>
          <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-1" style={{ color: '#64686d' }}>
            Webhook URL
          </p>
          <pre
            className="text-[12px] leading-[1.45] text-[#40454a] overflow-x-auto rounded-md p-3"
            style={{ background: '#f4f3f1', color: '#1c1f23' }}
          >
            {secret.webhookUrl}
          </pre>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => void onCopy('webhookUrl', secret.webhookUrl)}
            className="text-[11px] font-medium leading-4 text-[#64686d] mt-2 inline-flex items-center gap-1.5"
            style={{ color: '#9f4f08' }}
          >
            {copiedField === 'webhookUrl' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy webhook URL
          </button>
        </div>

        <div>
          <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-1" style={{ color: '#64686d' }}>
            Header name (optional)
          </p>
          <code className="text-[12px] leading-[1.45] text-[#40454a]" style={{ color: '#1c1f23' }}>
            {secret.headerName}
          </code>
        </div>

        <div>
          <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-1" style={{ color: '#64686d' }}>
            Secret value
          </p>
          <pre
            className="text-[12px] leading-[1.45] text-[#40454a] overflow-x-auto rounded-md p-3 font-mono"
            style={{ background: '#f4f3f1', color: '#1c1f23' }}
          >
            {secret.secret}
          </pre>
          <button
            type="button"
            disabled={!canManage}
            onClick={() => void onCopy('secret', secret.secret)}
            className="font-medium text-[13px] leading-5 text-[#1c1f23] mt-2 inline-flex items-center gap-2 rounded-md px-3 py-2"
            style={{ background: '#9f4f08', color: '#fff' }}
          >
            {copiedField === 'secret' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiedField === 'secret' ? 'Copied' : 'Copy secret'}
          </button>
        </div>
      </div>

      <ol className="text-[13px] leading-5 text-[#40454a] list-decimal space-y-2 pl-5" style={{ color: '#64686d' }}>
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
        className="text-[11px] font-medium leading-4 text-[#64686d] underline"
        style={{ color: '#64686d' }}
      >
        I saved the secret - hide this panel
      </button>
    </Card>
  );
}
