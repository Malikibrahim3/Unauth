import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import type { ConnectionState } from '@/lib/connections/getConnectionState';

interface PartialSetupHeroProps {
  connection: ConnectionState;
}

function ShopifyMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#96BF48" />
      <path d="M22 10.6c0-.1-.1-.2-.2-.2-.1 0-1.8-.1-1.8-.1s-1.2-1.2-1.3-1.3c-.1-.1-.4-.1-.5-.1l-.7.2c-.1-.4-.4-.8-.7-1.1-.5-.5-1.1-.7-1.7-.7h-.1c-.2-.2-.5-.4-.8-.4-2 0-3 2.5-3.3 3.7l-1.8.6c-.5.2-.5.2-.6.7L8 22.2l8 1.5 4.3-1c0-.1 1.8-11.9 1.7-12zm-5.6-1.7l-1.1.3c0-.1 0-.2.1-.4.3-.9.7-1.4 1-1.7v1.8zm-1.6-.4c-.2.2-.5.6-.8 1.5l-.9.3c.3-1 .9-1.9 1.7-2.1v.3zm0-.8c0 .1 0 0 0 0-.6.1-1.4 1-1.8 2.4l-1.3.4c.4-1.4 1.4-3.8 3.1-3.8v1z" fill="white"/>
    </svg>
  );
}

function HelpdeskMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-6 w-6" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#7B2D26" />
      <path d="M16 8c-4.4 0-8 3.6-8 8s3.6 8 8 8h8V16c0-4.4-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" fill="white"/>
    </svg>
  );
}

export default function PartialSetupHero({ connection }: PartialSetupHeroProps) {
  const shopifyDone = connection.orderSourceConnected || connection.shopifyOnlyConnected;
  const helpdeskDone = connection.helpdesk || connection.helpdeskOnlyConnected;

  const heading = shopifyDone
    ? 'Connect Gorgias to activate claim intelligence in tickets'
    : helpdeskDone
      ? 'Connect Shopify to add order context'
      : 'Start with Shopify + Gorgias';

  const body = shopifyDone
    ? 'Shopify is syncing. Connect Gorgias so your agents see claim context — order history, prior claims, and trust indicators — inside every ticket. Zendesk and Freshdesk also work.'
    : helpdeskDone
      ? 'Claim history is coming from your helpdesk. Shopify provides the order data that ties it all together. Without both, the picture is incomplete.'
      : 'Shopify provides order data. Gorgias provides claim history. Both are required for claim rates, confidence grades, and evidence packages.';

  const steps: Array<{ done: boolean; icon: React.ReactNode; label: string; sub: string }> = [
    {
      done: shopifyDone,
      icon: <ShopifyMark />,
      label: 'Shopify',
      sub: shopifyDone ? 'Connected - orders syncing' : 'Required - syncs orders and identity signals',
    },
    {
      done: helpdeskDone,
      icon: <HelpdeskMark />,
      label: 'Gorgias',
      sub: helpdeskDone ? 'Connected — claims syncing' : 'Recommended · Zendesk and Freshdesk also supported',
    },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2
          className="font-semibold mb-1.5"
          style={{ fontSize: '20px', color: 'var(--ink-primary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}
        >
          {heading}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-secondary)', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
          {body}
        </p>
      </div>

      <div
        className="rounded-xl p-5 space-y-3"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)' }}
      >
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center gap-4 rounded-lg px-4 py-3"
            style={{
              background: 'var(--surface-base)',
              border: `1px solid ${step.done ? 'color-mix(in srgb, var(--sev-clear) 30%, var(--border-default))' : 'var(--border-default)'}`,
            }}
          >
            <div className="shrink-0">{step.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>{step.label}</p>
              <p className="text-xs mt-0.5" style={{ color: step.done ? 'var(--sev-clear)' : 'var(--ink-tertiary)' }}>
                {step.sub}
              </p>
            </div>
            <div className="shrink-0">
              {step.done
                ? <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--sev-clear)' }} />
                : <Circle className="h-5 w-5" style={{ color: 'var(--border-default)' }} />
              }
            </div>
          </div>
        ))}

        <div className="pt-1">
          <Link
            href="/settings/integrations"
            className="btn-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
          >
            {shopifyDone ? 'Connect Gorgias' : helpdeskDone ? 'Connect Shopify' : 'Set up integrations'}
          </Link>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3"
        style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-default)' }}
      >
        <p className="text-xs" style={{ color: 'var(--ink-secondary)' }}>
          Not ready to connect yet? Upload a CSV export to explore what Unauth surfaces - integrations can be added later.
        </p>
        <Link
          href="/upload?welcome=1"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)', color: 'var(--ink-primary)' }}
        >
          Historical import
        </Link>
      </div>
    </div>
  );
}
