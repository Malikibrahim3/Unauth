'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, Plug, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { useFetchJson } from '@/lib/react/useFetchJson';
import {
  type EvidenceCapability,
  type IntegrationCategory,
  type ProviderConnectionView,
} from '@/lib/integrations/types';

type IntegrationsResponse = {
  providers: ProviderConnectionView[];
};

type ConnectTarget = ProviderConnectionView | null;
type SyncTarget = ProviderConnectionView | null;

const CAPABILITY_LABELS: Partial<Record<EvidenceCapability, string>> = {
  read_correspondence: 'read correspondence',
  send_correspondence: 'send correspondence',
  read_attachments: 'read attachments',
  ticket_messages: 'ticket messages',
  ticket_attachments: 'ticket attachments',
  customer_claim_reason: 'claim reason',
  requested_action: 'requested action',
  order_value: 'order value',
  line_items: 'line items',
  customer_history: 'customer history',
  refund_history: 'refund history',
  reship_history: 'reship history',
  tracking_number: 'tracking number',
  tracking_events: 'tracking events',
  delivery_status: 'delivery status',
  delivery_photo: 'delivery photo',
  signature: 'signature',
  dispute_status: 'dispute status',
  chargeback_evidence: 'chargeback evidence',
  contract_terms: 'contract terms',
  recovery_deadline: 'recovery deadline',
  order_details: 'order details',
  proof_of_value: 'proof of value',
  payment_record: 'payment record',
  payment_transaction: 'payment transaction',
  dispute_reason: 'dispute reason',
  customer_correspondence: 'customer correspondence',
  customer_claim_message: 'customer claim message',
  tracking_timeline: 'tracking timeline',
  delivery_confirmation: 'delivery confirmation',
  proof_of_delivery_photo: 'delivery photo proof',
  delivery_gps: 'delivery GPS',
  carrier_exception_reason: 'carrier exception reason',
  carrier_lost_confirmation: 'carrier lost confirmation',
  processor_case_update: 'processor case update',
  processor_settlement_status: 'processor settlement status',
  bank_trace_reference: 'bank trace reference',
  refund_failure_reason: 'refund failure reason',
  return_authorisation: 'return authorisation',
  return_tracking: 'return tracking',
  return_status: 'return status',
  return_request_status: 'return request status',
  return_inspection_outcome: 'return inspection outcome',
  warehouse_receiving_scan: 'warehouse receiving scan',
  returned_item_condition: 'returned item condition',
  returned_sku: 'returned SKU',
  package_weight: 'package weight',
  returns_provider_case_update: 'returns provider case update',
  fulfilment_record: 'fulfilment record',
  pick_pack_log: 'pick/pack log',
  packed_sku: 'packed SKU',
  expected_sku: 'expected SKU',
  warehouse_confirmation: 'warehouse confirmation',
  three_pl_confirmation: '3PL confirmation',
  purchase_order: 'purchase order',
  supplier_invoice: 'supplier invoice',
  receiving_record: 'receiving record',
  supplier_correspondence: 'supplier correspondence',
  vendor_credit_note: 'vendor credit note',
  warehouse_discrepancy_report: 'warehouse discrepancy report',
  marketplace_case_status: 'marketplace case status',
  marketplace_correspondence: 'marketplace correspondence',
  protection_claim_status: 'protection claim status',
  handover_scan: 'handover scan',
  warehouse_exception: 'warehouse exception',
  damage_photo: 'damage photo',
  carrier_damage_report: 'carrier damage report',
  customs_charge_record: 'customs charge record',
  customs_broker_correspondence: 'customs broker correspondence',
  duty_tax_invoice: 'duty/tax invoice',
  shipment_manifest: 'shipment manifest',
  subscription_status: 'subscription status',
  digital_fulfilment_log: 'digital fulfilment log',
  warehouse_pick_pack: 'pick/pack record',
  three_pl_sla_claim_status: '3PL SLA claim status',
  carrier_claim_submission_status: 'carrier claim submission status',
  carrier_claim_outcome: 'carrier claim outcome',
  recovery_amount_approved: 'recovery amount approved',
  recovery_amount_paid: 'recovery amount paid',
};

function capabilityLabel(capability: EvidenceCapability) {
  return CAPABILITY_LABELS[capability] ?? capability.replaceAll('_', ' ');
}

function statusLabel(provider: ProviderConnectionView) {
  if (provider.buildStatus === 'slot_only') return 'Not connected';
  if (provider.status === 'connected') return 'Connected';
  if (provider.status === 'connection_error' || provider.status === 'error') return 'Connection error';
  if (provider.status === 'syncing') return 'Syncing';
  if (provider.status === 'disabled') return 'Disabled';
  return 'Not connected';
}

function ProviderCard({
  provider,
  onConnect,
  onDisconnect,
  onSync,
  busyProvider,
}: {
  provider: ProviderConnectionView;
  onConnect: (provider: ProviderConnectionView) => void;
  onDisconnect: (provider: ProviderConnectionView) => void;
  onSync: (provider: ProviderConnectionView) => void;
  busyProvider: string | null;
}) {
  const connected = provider.status === 'connected';
  const slotOnly = provider.buildStatus === 'slot_only';
  const busy = busyProvider === provider.id;
  return (
    <div
      className="rounded-md border p-4"
      style={{
        borderColor: connected ? 'color-mix(in srgb, var(--success) 35%, var(--border-muted))' : 'var(--border-muted)',
        background: 'var(--surface)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{provider.name}</p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {provider.description ?? provider.evidenceCapabilities.join(' · ')}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{
            color: connected ? 'var(--success)' : slotOnly ? 'var(--text-secondary)' : 'var(--text)',
            background: connected ? 'var(--success-bg)' : 'var(--bg-inset)',
          }}
        >
          {statusLabel(provider)}
        </span>
      </div>
      {provider.detail || provider.lastError ? (
        <p className="mt-3 text-xs" style={{ color: provider.lastError ? 'var(--warning)' : 'var(--text-secondary)' }}>
          {provider.lastError ?? provider.detail}
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {slotOnly ? 'Adds' : 'Collects'}: {provider.evidenceCapabilities.map(capabilityLabel).join(', ')}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {slotOnly ? (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Slot only. Connectors must be implemented before source data can be collected.
          </span>
        ) : connected ? (
          <>
            <button
              type="button"
              onClick={() => onSync(provider)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync
            </button>
            <button
              type="button"
              onClick={() => onDisconnect(provider)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onConnect(provider)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <Plug className="h-3.5 w-3.5" />
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

function EvidenceCoverageSummary({
  providers,
}: {
  providers: ProviderConnectionView[];
}) {
  const connectedLiveCapabilities = Array.from(new Set(
    providers
      .filter((provider) => provider.buildStatus === 'live' && provider.status === 'connected')
      .flatMap((provider) => provider.evidenceCapabilities),
  ));
  const slotCapabilities = Array.from(new Set(
    providers
      .filter((provider) => provider.buildStatus === 'slot_only')
      .flatMap((provider) => provider.evidenceCapabilities),
  ));

  return (
    <section className="rounded-md border p-4" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Evidence coverage</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Connected live sources vs. capabilities that only exist on visible slots.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>
            Connected live evidence
          </p>
          {connectedLiveCapabilities.length > 0 ? (
            <ul className="space-y-1.5">
              {connectedLiveCapabilities.map((capability) => (
                <li key={capability} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text)' }}>
                  <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--success)' }} />
                  {capabilityLabel(capability)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No live evidence source is connected yet.</p>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-secondary)' }}>
            Slot-only coverage
          </p>
          <ul className="space-y-1.5">
            {slotCapabilities.map((capability) => (
              <li key={capability} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="h-3.5 w-3.5 rounded-sm border" style={{ borderColor: 'var(--border)' }} />
                {capabilityLabel(capability)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function ConnectModal({
  target,
  busy,
  onClose,
  onSubmit,
}: {
  target: ConnectTarget;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, string>) => Promise<void>;
}) {
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [environment, setEnvironment] = useState('production');

  if (!target) return null;
  const apiKeyMode = target.id === 'aftership';
  const oauthMode = target.id === 'ups' || target.id === 'fedex';

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit(apiKeyMode
      ? { apiKey, webhookSecret }
      : { clientId, clientSecret, accountNumber, environment });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.45)' }}>
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-md border p-5 shadow-xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connect {target.name}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Credentials are encrypted before storage.</p>
          </div>
          <button type="button" onClick={onClose} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Close</button>
        </div>

        {apiKeyMode ? (
          <div className="space-y-3">
            <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }} placeholder="AfterShip API key" />
            <input value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }} placeholder="Webhook signing secret (optional)" />
          </div>
        ) : oauthMode ? (
          <div className="space-y-3">
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }} placeholder="OAuth client ID" />
            <input value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} type="password" className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }} placeholder="OAuth client secret" />
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }} placeholder="Carrier account number" />
            <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }}>
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </div>
        ) : null}

        <button type="submit" disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--accent)', color: 'white' }}>
          <ShieldCheck className="h-4 w-4" />
          {busy ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  );
}

function SyncModal({
  target,
  busy,
  onClose,
  onSubmit,
}: {
  target: SyncTarget;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, string>) => Promise<void>;
}) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [supportPayoutCaseId, setSupportPayoutCaseId] = useState('');

  if (!target) return null;
  const needsTracking = target.id === 'aftership' || target.id === 'ups' || target.id === 'fedex';

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({ trackingNumber, supportPayoutCaseId });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.45)' }}>
      <form className="w-full max-w-md rounded-md border p-5 shadow-xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} onSubmit={submit}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sync {target.name}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Fetched data is normalized into case evidence.</p>
          </div>
          <button type="button" onClick={onClose} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Close</button>
        </div>
        <div className="space-y-3">
          {needsTracking ? (
            <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }} placeholder="Tracking number" />
          ) : null}
          <input value={supportPayoutCaseId} onChange={(e) => setSupportPayoutCaseId(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)' }} placeholder="Support payout case ID (optional)" />
        </div>
        <button type="submit" disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60" style={{ background: 'var(--accent)', color: 'white' }}>
          <RefreshCw className="h-4 w-4" />
          {busy ? 'Syncing...' : 'Sync'}
        </button>
      </form>
    </div>
  );
}

export default function IntegrationHubClient() {
  const { data, loading, error, reload } = useFetchJson<IntegrationsResponse>('/api/integrations');
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [connectTarget, setConnectTarget] = useState<ConnectTarget>(null);
  const [syncTarget, setSyncTarget] = useState<SyncTarget>(null);
  const providers = data?.providers ?? [];
  const core = useMemo(() => providers.filter((p) => p.id === 'shopify' || p.id === 'gorgias'), [providers]);
  const trackingProof = useMemo(
    () => providers.filter((p) => p.buildStatus === 'live' && (p.category === 'tracking' || p.category === 'carrier')),
    [providers],
  );
  const sourceSlotSections = useMemo(() => {
    const sections: Array<{ title: string; categories: IntegrationCategory[]; providers: ProviderConnectionView[] }> = [
      { title: 'Email & correspondence', categories: ['email', 'helpdesk', 'internal_comms'], providers: [] },
      { title: 'Payments & chargebacks', categories: ['payments', 'chargebacks'], providers: [] },
      { title: 'Carriers & tracking', categories: ['carrier', 'tracking'], providers: [] },
      { title: '3PL, WMS & returns', categories: ['3pl', 'wms', 'returns'], providers: [] },
      { title: 'Marketplaces & protection', categories: ['marketplace', 'shipping_protection'], providers: [] },
      { title: 'ERP & suppliers', categories: ['erp', 'supplier'], providers: [] },
    ];
    return sections
      .map((section) => ({
        ...section,
        providers: providers.filter(
          (provider) =>
            provider.buildStatus === 'slot_only' &&
            section.categories.includes(provider.category),
        ),
      }))
      .filter((section) => section.providers.length > 0);
  }, [providers]);

  async function postJson(path: string, body: Record<string, unknown> = {}) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error ?? 'Request failed');
    return payload;
  }

  async function handleConnect(provider: ProviderConnectionView) {
    if (provider.id === 'shopify' || provider.id === 'gorgias') {
      window.location.href = provider.id === 'shopify' ? '/settings/integrations/shopify' : '/settings/integrations/gorgias';
      return;
    }
    setConnectTarget(provider);
  }

  async function submitConnect(payload: Record<string, string>) {
    if (!connectTarget) return;
    setBusyProvider(connectTarget.id);
    try {
      const path = connectTarget.id === 'aftership'
        ? `/api/integrations/${connectTarget.id}/api-key`
        : `/api/integrations/${connectTarget.id}/connect`;
      await postJson(path, payload);
      setMessage(`${connectTarget.name} connected.`);
      setConnectTarget(null);
      reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleDisconnect(provider: ProviderConnectionView) {
    setBusyProvider(provider.id);
    try {
      await postJson(`/api/integrations/${provider.id}/disconnect`);
      setMessage(`${provider.name} disconnected.`);
      reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Disconnect failed.');
    } finally {
      setBusyProvider(null);
    }
  }

  async function submitSync(payload: Record<string, string>) {
    if (!syncTarget) return;
    setBusyProvider(syncTarget.id);
    try {
      await postJson(`/api/integrations/${syncTarget.id}/sync`, Object.fromEntries(
        Object.entries(payload).filter(([, value]) => value.trim()),
      ));
      setMessage(`${syncTarget.name} sync completed.`);
      setSyncTarget(null);
      reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setBusyProvider(null);
    }
  }

  if (loading && providers.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading integrations...</p>;
  }

  if (error) {
    return <p className="text-sm" style={{ color: 'var(--warning)' }}>{error}</p>;
  }

  return (
    <div className="space-y-8">
      {message ? (
        <div className="rounded-md border px-4 py-3 text-sm" style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)', color: 'var(--text)' }}>
          {message}
        </div>
      ) : null}

      <EvidenceCoverageSummary providers={providers} />

      <Section title="Core">
        {core.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} onConnect={handleConnect} onDisconnect={handleDisconnect} onSync={setSyncTarget} busyProvider={busyProvider} />
        ))}
      </Section>

      <Section title="Tracking & Proof">
        {trackingProof.map((provider) => (
          <ProviderCard key={provider.id} provider={provider} onConnect={handleConnect} onDisconnect={handleDisconnect} onSync={setSyncTarget} busyProvider={busyProvider} />
        ))}
      </Section>

      {sourceSlotSections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} onConnect={handleConnect} onDisconnect={handleDisconnect} onSync={setSyncTarget} busyProvider={busyProvider} />
          ))}
        </Section>
      ))}

      <ConnectModal target={connectTarget} busy={busyProvider === connectTarget?.id} onClose={() => setConnectTarget(null)} onSubmit={submitConnect} />
      <SyncModal target={syncTarget} busy={busyProvider === syncTarget?.id} onClose={() => setSyncTarget(null)} onSubmit={submitSync} />
    </div>
  );
}
