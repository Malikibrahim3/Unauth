'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, KeyRound } from 'lucide-react';
import { useAsyncResource } from '@/lib/react/useFetchJson';
import { fetchIntegrationConnectionStatus } from '@/components/settings/fetchIntegrationConnectionStatus';
import {
  hasGateReadyConnection,
  type GateHealthConnection,
} from '@/lib/integrations/gateReadiness';

type ApiKeysBody = { keys?: Array<{ id: string; revoked_at?: string | null }> };
type RulesBody = { rules?: Array<{ id: string; is_active?: boolean; active?: boolean; name?: string | null }> };
type IntegrationsBody = { providers?: Array<{ id: string; status?: string | null }> };
type HealthBody = { connections?: GateHealthConnection[] };

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Failed to load ${url}`);
  return body as T;
}

function ChecklistRow({
  done,
  label,
  href,
}: {
  done: boolean;
  label: string;
  href: string;
}) {
  const Icon = done ? CheckCircle2 : Circle;
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-muted)' }}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color: done ? 'var(--success)' : 'var(--icon-muted)' }} />
        <span className="truncate" style={{ color: 'var(--text-primary)' }}>{label}</span>
      </span>
      <span className="text-xs font-medium" style={{ color: done ? 'var(--success)' : 'var(--text-tertiary)' }}>
        {done ? 'Ready' : 'Required'}
      </span>
    </Link>
  );
}

export default function GateActivationChecklist() {
  const { data: status } = useAsyncResource('gate-activation-status', fetchIntegrationConnectionStatus);
  const { data: keys } = useAsyncResource('gate-api-keys', () => fetchJson<ApiKeysBody>('/api/settings/api-keys'));
  const { data: rules } = useAsyncResource('gate-rules', () => fetchJson<RulesBody>('/api/rules'));
  const { data: integrations } = useAsyncResource('gate-integrations', () => fetchJson<IntegrationsBody>('/api/integrations'));
  const { data: health } = useAsyncResource('gate-integration-health', () => fetchJson<HealthBody>('/api/integrations/health'));

  const hasApiKey = (keys?.keys ?? []).some((key) => !key.revoked_at);
  const hasDnrRule = (rules?.rules ?? []).some((rule) => {
    const name = (rule.name ?? '').toLowerCase();
    const active = rule.is_active ?? rule.active ?? true;
    return active && (name.includes('dnr') || name.includes('not received') || name.includes('delivery'));
  });
  const hasTrackingSource = (integrations?.providers ?? []).some((provider) =>
    ['aftership', 'ups', 'fedex', 'carrier_claims'].includes(provider.id) &&
    (provider.status === 'connected' || provider.status === 'syncing')
  );
  const healthConnections = health?.connections ?? [];
  const shopifyReady = Boolean(status?.shopify.connected) && hasGateReadyConnection(healthConnections, 'shopify');
  const gorgiasReady = Boolean(status?.gorgias.connected) && hasGateReadyConnection(
    healthConnections,
    'gorgias',
    { requireWebhook: true },
  );
  const items = [
    { done: shopifyReady, label: 'Shopify connection verified, current, and syncing', href: '/settings/integrations/shopify' },
    { done: gorgiasReady, label: 'Gorgias connection current with a healthy webhook', href: '/settings/integrations/gorgias' },
    { done: hasTrackingSource, label: 'AfterShip or carrier tracking source connected', href: '/settings/integrations' },
    { done: hasDnrRule, label: 'At least one DNR review rule configured', href: '/rules' },
    { done: false, label: 'unauth-hold added to Gorgias AI Agent Handover Topics', href: '/settings/integrations/gorgias' },
    { done: hasApiKey, label: 'Gate API key generated for Yuma or Siena', href: '/settings/integrations#advanced' },
  ];
  const readyCount = items.filter((item) => item.done).length;
  const allReady = readyCount === items.length;

  return (
    <section
      className="space-y-3 rounded-md p-4"
      style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI agent payout gate</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            If an AI agent (like Yuma or Siena) resolves tickets for you, the gate holds any payout it proposes until these checks pass.
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            The gate is live only when every required connection and operating control is ready.
          </p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
          style={{
            background: allReady ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'var(--warning-bg)',
            color: allReady ? 'var(--success)' : 'var(--warning-fg)',
          }}
        >
          <KeyRound className="h-3.5 w-3.5" />
          {readyCount}/{items.length}
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <ChecklistRow key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
