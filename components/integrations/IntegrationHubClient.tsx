'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react';
import { PanelCard, StatusBadge as SharedStatusBadge } from '@/components/ui';
import { useFetchJson, useAsyncResource } from '@/lib/react/useFetchJson';
import { fetchIntegrationConnectionStatus } from '@/components/settings/fetchIntegrationConnectionStatus';
import type { EvidenceCapability, ProviderConnectionView } from '@/lib/integrations/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type IntegrationsResponse = {
  providers: ProviderConnectionView[];
  categoryApplicability?: Array<{ category: string; status: string; setAt: string | null }>;
  paymentSetup?: {
    shopifyPaymentsCovered: boolean | null;
    inferredProcessor: 'stripe' | 'paypal' | 'adyen' | 'other' | null;
    processorSelection: 'stripe' | 'paypal' | 'adyen' | 'other' | null;
  };
};

type ApplicabilityCategory = 'warehouse_3pl' | 'returns';
type ApplicabilityState = 'pending' | 'applicable' | 'not_applicable';
type PaymentProcessorChoice = 'stripe' | 'paypal' | 'adyen' | 'other';

type StaticPlatform = {
  id: string;
  name: string;
  description: string;
  logo: string;
  href: string;
  comingSoon?: boolean;
};

type UnifiedProvider = {
  id: string;
  name: string;
  description: string;
  logo: string;
  connected: boolean;
  connectionIssue: boolean;
  detail: string | null;
  comingSoon?: boolean;
  // For dynamic providers
  dynamic?: ProviderConnectionView;
  // For static platforms
  href?: string;
  isShopify?: boolean;
};

// ---------------------------------------------------------------------------
// Logo map
// ---------------------------------------------------------------------------

const PROVIDER_LOGOS: Record<string, string> = {
  shopify: '/integrations/shopify.svg',
  gorgias: '/integrations/gorgias.png',
  aftership: '/integrations/aftership.svg',
  ups: '/integrations/ups.svg',
  fedex: '/integrations/fedex.svg',
  document_upload: '/integrations/document-upload.svg',
  self_fulfillment_pack: '/integrations/self-fulfillment.svg',
  shipbob: '/integrations/shipbob.svg',
  stripe: '/integrations/stripe.svg',
  carrier_claims: '/integrations/carrier-claims.svg',
  woocommerce: '/integrations/woocommerce.svg',
  bigcommerce: '/integrations/bigcommerce.svg',
  magento: '/integrations/magento.svg',
  freshdesk: '/integrations/freshdesk.png',
  zendesk: '/integrations/zendesk.svg',
};

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function IntegrationStatusBadge({
  connected,
  connectionIssue,
  comingSoon,
}: {
  connected: boolean;
  connectionIssue: boolean;
  comingSoon?: boolean;
}) {
  if (comingSoon) {
    return <SharedStatusBadge variant="held" dot={false}>Soon</SharedStatusBadge>;
  }
  if (connected) {
    return <SharedStatusBadge variant="cleared">Connected</SharedStatusBadge>;
  }
  if (connectionIssue) {
    return (
      <SharedStatusBadge variant="flagged" className="gap-1.5">
        <AlertTriangle className="h-3 w-3" />
        Issue
      </SharedStatusBadge>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Provider card
// ---------------------------------------------------------------------------

function ProviderCard({
  provider,
  onConnect,
  onDisconnect,
  onSync,
  onUpload,
  busyId,
}: {
  provider: UnifiedProvider;
  onConnect: (p: UnifiedProvider) => void;
  onDisconnect: (p: UnifiedProvider) => void;
  onSync: (p: ProviderConnectionView) => void;
  onUpload: (p: ProviderConnectionView) => void;
  busyId: string | null;
}) {
  const busy = busyId === provider.id;
  const dyn = provider.dynamic;
  const isDocument = provider.id === 'document_upload';
  const canSync = dyn && !isDocument && provider.id !== 'self_fulfillment_pack';

  const borderColor = provider.connected
    ? 'color-mix(in srgb, var(--success) 30%, var(--border-muted))'
    : provider.connectionIssue
    ? 'color-mix(in srgb, var(--warning) 30%, var(--border-muted))'
    : 'var(--border-muted)';

  const bgColor = provider.connected
    ? 'color-mix(in srgb, var(--success) 3%, var(--surface))'
    : provider.connectionIssue
    ? 'color-mix(in srgb, var(--warning) 3%, var(--surface))'
    : 'var(--surface)';

  return (
    <PanelCard
      variant="app"
      className="flex flex-col p-4 transition-shadow"
      style={{ borderColor, background: bgColor, minHeight: 160 }}
    >
      {/* Header row: logo + badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="h-11 w-11 shrink-0 rounded-xl overflow-hidden flex items-center justify-center p-1.5"
          style={{ background: 'white', border: '1px solid var(--border-muted)' }}
        >
          <Image
            src={provider.logo}
            alt={provider.name}
            width={44}
            height={44}
            className="h-full w-full object-contain"
          />
        </div>
        <IntegrationStatusBadge
          connected={provider.connected}
          connectionIssue={provider.connectionIssue}
          comingSoon={provider.comingSoon}
        />
      </div>

      {/* Name + detail */}
      <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>
        {provider.name}
      </p>
      {provider.connected && provider.detail ? (
        <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {provider.detail}
        </p>
      ) : null}
      {provider.connected && dyn ? (
        <p className="mt-1 text-xs" style={{ color: 'var(--success)' }}>
          {dyn.lastSyncAt ? `Last synced ${new Date(dyn.lastSyncAt).toLocaleDateString()}` : 'Connected · initial import pending'}
          {dyn.authMode === 'oauth' ? ' · OAuth' : ''}
        </p>
      ) : null}
      {provider.connectionIssue && !provider.connected ? (
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--warning)' }}>
          Connection lost. Reconnect to restore.
        </p>
      ) : (
        <p className="mt-1 text-xs leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
          {provider.description}
        </p>
      )}

      {/* Error from dynamic provider */}
      {dyn?.lastError ? (
        <p className="mt-1 text-xs" style={{ color: 'var(--warning)' }}>{dyn.lastError}</p>
      ) : null}

      {/* Actions */}
      {!provider.comingSoon ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isDocument ? (
            <>
              <button
                type="button"
                onClick={() => dyn && onUpload(dyn)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
              {provider.connected && (
                <button
                  type="button"
                  onClick={() => onDisconnect(provider)}
                  disabled={busy}
                  className="text-xs disabled:opacity-50"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Remove
                </button>
              )}
            </>
          ) : provider.connected ? (
            <>
              {provider.href ? (
                <a
                  href={provider.href}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Reconnect
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onDisconnect(provider)}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Manage
                </button>
              )}
              {canSync && dyn ? (
                <button
                  type="button"
                  onClick={() => onSync(dyn)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync
                </button>
              ) : null}
            </>
          ) : provider.connectionIssue && provider.href ? (
            <a
              href={provider.href}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: 'color-mix(in srgb, var(--warning) 40%, var(--border))',
                color: 'var(--warning)',
              }}
            >
              Reconnect
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          ) : provider.connectionIssue ? (
            <button
              type="button"
              onClick={() => onConnect(provider)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              style={{
                borderColor: 'color-mix(in srgb, var(--warning) 40%, var(--border))',
                color: 'var(--warning)',
              }}
            >
              Reconnect
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : provider.href ? (
            <a
              href={provider.href}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Connect
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => onConnect(provider)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Connect
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : null}
    </PanelCard>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shopify connect modal
// ---------------------------------------------------------------------------

function ShopifyModal({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (shop: string) => void;
}) {
  const [value, setValue] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setValue(''); setErr(null); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) { setErr('Enter your Shopify store domain.'); return; }
    onOpen(raw);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <Image src="/integrations/shopify.svg" alt="Shopify" width={40} height={40} className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connect Shopify</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Opens Shopify to authorise</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="shopify-domain" className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>
              Store domain
            </label>
            <input
              id="shopify-domain"
              ref={inputRef}
              value={value}
              onChange={(e) => { setValue(e.target.value); setErr(null); }}
              placeholder="yourstore or yourstore.myshopify.com"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--bg-inset)',
                border: `1px solid ${err ? 'var(--risk-critical)' : 'var(--border)'}`,
                color: 'var(--text)',
              }}
            />
            {err ? (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--risk-critical)' }}>{err}</p>
            ) : (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Shopify opens in a new window so you don&apos;t lose your place.
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            Continue with Shopify →
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API-key / OAuth connect modal
// ---------------------------------------------------------------------------

function ConnectModal({
  target,
  busy,
  onClose,
  onSubmit,
}: {
  target: UnifiedProvider | null;
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

  const isApiKey = target.id === 'aftership' || target.id === 'shipbob';
  const isOAuth = target.id === 'ups' || target.id === 'fedex';

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSubmit(isApiKey
      ? { apiKey, webhookSecret }
      : { clientId, clientSecret, accountNumber, environment });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <Image src={target.logo} alt={target.name} width={40} height={40} className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connect {target.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Credentials are encrypted at rest.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {isApiKey ? (
            <>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
                placeholder={target.id === 'shipbob' ? 'ShipBob personal access token' : 'AfterShip API key'}
              />
              {target.id === 'aftership' ? (
                <input
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
                  placeholder="Webhook signing secret (optional)"
                />
              ) : null}
            </>
          ) : isOAuth ? (
            <>
              <input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
                placeholder="OAuth client ID"
              />
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
                placeholder="OAuth client secret"
              />
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
                placeholder="Carrier account number"
              />
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
              >
                <option value="production">Production</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <ShieldCheck className="h-4 w-4" />
          {busy ? 'Connecting…' : 'Connect'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sync modal
// ---------------------------------------------------------------------------

function SyncModal({
  target,
  busy,
  onClose,
  onSubmit,
}: {
  target: ProviderConnectionView | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, string>) => Promise<void>;
}) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [caseId, setCaseId] = useState('');

  if (!target) return null;
  const needsTracking = ['aftership', 'ups', 'fedex'].includes(target.id);

  async function submit(e: FormEvent) {
    e.preventDefault();
    await onSubmit({ trackingNumber, orderReference, supportPayoutCaseId: caseId });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <Image src={PROVIDER_LOGOS[target.id] ?? '/integrations/carrier-claims.svg'} alt={target.name} width={40} height={40} className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sync {target.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Fetched data is mapped to case evidence.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {needsTracking ? (
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
              placeholder="Tracking number"
            />
          ) : null}
          {target.id === 'shipbob' ? (
            <input
              value={orderReference}
              onChange={(e) => setOrderReference(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
              placeholder="Shopify order number or ShipBob reference"
            />
          ) : null}
          <input
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
            placeholder="Support payout case ID (optional)"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <RefreshCw className="h-4 w-4" />
          {busy ? 'Syncing…' : 'Sync'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document upload modal
// ---------------------------------------------------------------------------

function DocumentUploadModal({
  target,
  busy,
  onClose,
  onSubmit,
}: {
  target: ProviderConnectionView | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: FormData) => Promise<void>;
}) {
  const [documentType, setDocumentType] = useState('carrier_agreement');
  const [file, setFile] = useState<File | null>(null);

  if (!target) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.set('document_type', documentType);
    fd.set('file', file);
    await onSubmit(fd);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <Image src="/integrations/document-upload.svg" alt="Documents" width={40} height={40} className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Upload contract document</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Terms stay inactive until approved.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
          >
            <option value="carrier_agreement">Carrier Agreement</option>
            <option value="three_pl_sla">3PL SLA</option>
            <option value="supplier_terms">Supplier Terms</option>
            <option value="insurance_policy">Insurance Policy</option>
          </select>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-inset)', color: 'var(--text)' }}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !file}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Upload className="h-4 w-4" />
          {busy ? 'Uploading…' : 'Upload document'}
        </button>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary banner
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Category header with done-state indicator
// ---------------------------------------------------------------------------

function CategoryHeader({
  number,
  title,
  description,
  satisfied,
}: {
  number?: number;
  title: string;
  description: string;
  satisfied: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-3">
      <div className="flex items-start gap-3 min-w-0">
        {number != null ? (
          <div
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{
              background: satisfied ? 'var(--success)' : 'var(--bg-inset)',
              color: satisfied ? 'white' : 'var(--text-secondary)',
              border: satisfied ? 'none' : '1.5px solid var(--border)',
            }}
          >
            {satisfied ? <CheckCircle2 className="h-3.5 w-3.5" /> : number}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        </div>
      </div>
      {satisfied ? (
        <span
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--success) 12%, transparent)',
            color: 'var(--success)',
          }}
        >
          <CheckCircle2 className="h-3 w-3" />
          Connected
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Provider grid wrapper
// ---------------------------------------------------------------------------

function ProviderGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fix 1: Setup progress checklist
// ---------------------------------------------------------------------------

function SetupProgressChecklist({
  storeConnected,
  storeName,
  storeDetail,
  helpdeskConnected,
  helpdeskName,
  helpdeskDetail,
  trackingConnected,
  trackingName,
  warehouseConnected,
  warehouseName,
}: {
  storeConnected: boolean;
  storeName: string | null;
  storeDetail: string | null;
  helpdeskConnected: boolean;
  helpdeskName: string | null;
  helpdeskDetail: string | null;
  trackingConnected: boolean;
  trackingName: string | null;
  warehouseConnected: boolean;
  warehouseName: string | null;
}) {
  const completed = [storeConnected, helpdeskConnected, trackingConnected, warehouseConnected].filter(Boolean).length;

  function storeLine() {
    if (storeConnected && storeName) {
      const detail = storeDetail ? ` · ${storeDetail}` : '';
      return `✓ Order source — ${storeName} connected${detail}`;
    }
    return '○ Order source — not connected yet';
  }

  function helpdeskLine() {
    if (helpdeskConnected && helpdeskName) {
      const detail = helpdeskDetail ? ` · ${helpdeskDetail}` : '';
      return `✓ Helpdesk — ${helpdeskName} connected${detail}`;
    }
    return '○ Helpdesk — not connected yet';
  }

  function trackingLine() {
    if (trackingConnected && trackingName) {
      return `✓ Tracking & proof — ${trackingName} connected`;
    }
    return '○ Tracking & proof — recommended, not connected yet';
  }

  function warehouseLine() {
    if (warehouseConnected && warehouseName) return `✓ Warehouse / 3PL — ${warehouseName} connected`;
    return '○ Warehouse / 3PL — optional, not connected yet';
  }

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl border px-5 py-4"
        style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Integration setup</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Connect the systems Unauth needs, then use this page to monitor their health.
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              background: completed >= 2 ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'var(--bg-inset)',
              color: completed >= 2 ? 'var(--success)' : 'var(--text-secondary)',
            }}
          >
            {completed}/4 sources connected
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <ChecklistRow done={storeConnected} text={storeLine()} />
          <ChecklistRow done={helpdeskConnected} text={helpdeskLine()} />
          <ChecklistRow
            done={trackingConnected}
            text={trackingLine()}
            action={!trackingConnected ? (
              <a href="#tracking-proof" className="shrink-0 text-xs font-medium underline underline-offset-2" style={{ color: 'var(--warning)' }}>
                Connect →
              </a>
            ) : null}
          />
          <ChecklistRow
            done={warehouseConnected}
            text={warehouseLine()}
            action={!warehouseConnected ? (
              <a href="#stack-setup" className="shrink-0 text-xs font-medium underline underline-offset-2" style={{ color: 'var(--text-secondary)' }}>
                View →
              </a>
            ) : null}
          />
        </div>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Required for the payout gate: an order source and helpdesk. Tracking and warehouse connections add evidence and fulfilment context.
      </p>
    </div>
  );
}

function ChecklistRow({
  done,
  text,
  action,
}: {
  done: boolean;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span style={{ color: done ? 'var(--text)' : 'var(--text-secondary)' }}>
        {text}
      </span>
      {action}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Fix 2: Connected category summary (collapsed when satisfied)
// ---------------------------------------------------------------------------

function ConnectedCategorySummary({
  title,
  provider,
  expanded,
  onToggleExpand,
  children,
}: {
  title: string;
  provider: UnifiedProvider;
  expanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}) {
  if (expanded) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
          <button
            type="button"
            onClick={onToggleExpand}
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5"
      style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}
    >
      <div
        className="h-8 w-8 shrink-0 rounded-lg overflow-hidden flex items-center justify-center p-1"
        style={{ background: 'white', border: '1px solid var(--border-muted)' }}
      >
        <Image src={provider.logo} alt={provider.name} width={32} height={32} className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </p>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {provider.name}
          {provider.detail ? (
            <span className="font-normal" style={{ color: 'var(--text-secondary)' }}> · {provider.detail}</span>
          ) : null}
        </p>
      </div>
      {provider.href ? (
        <a
          href={provider.href}
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Manage
        </a>
      ) : null}
      <button
        type="button"
        onClick={onToggleExpand}
        className="text-xs font-medium"
        style={{ color: 'var(--text)' }}
      >
        Change provider
      </button>
    </div>
  );
}

function RequiredCategorySection({
  title,
  description,
  satisfied,
  connectedProvider,
  expanded,
  onToggleExpand,
  children,
}: {
  title: string;
  description: string;
  satisfied: boolean;
  connectedProvider: UnifiedProvider | null;
  expanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}) {
  if (satisfied && connectedProvider && !expanded) {
    return (
      <ConnectedCategorySummary
        title={title}
        provider={connectedProvider}
        expanded={false}
        onToggleExpand={onToggleExpand}
      >
        {children}
      </ConnectedCategorySummary>
    );
  }

  if (satisfied && connectedProvider && expanded) {
    return (
      <ConnectedCategorySummary
        title={title}
        provider={connectedProvider}
        expanded
        onToggleExpand={onToggleExpand}
      >
        {children}
      </ConnectedCategorySummary>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compact slot-only provider line (not yet connectable)
// ---------------------------------------------------------------------------

function SlotProviderLine({ provider }: { provider: UnifiedProvider }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="h-7 w-7 shrink-0 rounded-md overflow-hidden flex items-center justify-center p-0.5"
        style={{ background: 'white', border: '1px solid var(--border-muted)' }}
      >
        <Image src={provider.logo} alt={provider.name} width={28} height={28} className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{provider.name}</p>
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
          {provider.description}
        </p>
      </div>
      <span
        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{ background: 'var(--bg-inset)', color: 'var(--text-secondary)' }}
      >
        Soon
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Request-an-integration link (shown where slot-only tiles were removed)
// ---------------------------------------------------------------------------

function RequestIntegrationLink({ subject }: { subject: string }) {
  return (
    <a
      href={`mailto:support@unauth.co?subject=${encodeURIComponent(subject)}`}
      className="inline-block text-xs font-medium underline underline-offset-2"
      style={{ color: 'var(--text-secondary)' }}
    >
      Need a different provider? Request an integration →
    </a>
  );
}

// ---------------------------------------------------------------------------
// Category applicability question (WMS / Returns)
// ---------------------------------------------------------------------------

function ApplicabilityChoiceButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50"
      style={{
        borderColor: 'var(--border-muted)',
        background: 'var(--surface)',
        color: 'var(--text)',
      }}
    >
      {children}
    </button>
  );
}

function CategoryApplicabilityQuestion({
  question,
  yesLabel,
  noLabel,
  notApplicableMessage,
  applicableAnswerLabel,
  state,
  busy,
  editing,
  onUseOne,
  onNotApplicable,
  onChangeDecision,
  children,
}: {
  question: string;
  yesLabel: string;
  noLabel: string;
  notApplicableMessage: string;
  applicableAnswerLabel: string;
  state: ApplicabilityState;
  busy: boolean;
  editing: boolean;
  onUseOne: () => void;
  onNotApplicable: () => void;
  onChangeDecision: () => void;
  children: React.ReactNode;
}) {
  if (state === 'not_applicable' && !editing) {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
        style={{ borderColor: 'var(--border-muted)', background: 'var(--bg-inset)' }}
      >
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{notApplicableMessage}</p>
        <button
          type="button"
          onClick={onChangeDecision}
          className="text-xs font-medium shrink-0"
          style={{ color: 'var(--text)' }}
        >
          Change
        </button>
      </div>
    );
  }

  if (state === 'applicable' && !editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {applicableAnswerLabel}
          </p>
          <button
            type="button"
            onClick={onChangeDecision}
            className="text-xs font-medium shrink-0"
            style={{ color: 'var(--text-secondary)' }}
          >
            Change
          </button>
        </div>
        {children}
      </div>
    );
  }

  // pending or editing: show the question
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{question}</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Choose an answer to tailor the setup checklist. You can also connect the provider now.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ApplicabilityChoiceButton onClick={onUseOne} disabled={busy}>
          {yesLabel}
        </ApplicabilityChoiceButton>
        <ApplicabilityChoiceButton onClick={onNotApplicable} disabled={busy}>
          {noLabel}
        </ApplicabilityChoiceButton>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payments & disputes section
// ---------------------------------------------------------------------------

const PAYMENT_PROCESSOR_OPTIONS: Array<{ id: PaymentProcessorChoice; label: string }> = [
  { id: 'stripe', label: 'Stripe' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'adyen', label: 'Adyen' },
  { id: 'other', label: 'Other' },
];

function PaymentsDisputesSection({
  shopifyPaymentsCovered,
  inferredProcessor,
  selectedProcessor,
  onSelectProcessor,
  payments,
  cardProps,
}: {
  shopifyPaymentsCovered: boolean | null;
  inferredProcessor: PaymentProcessorChoice | null;
  selectedProcessor: PaymentProcessorChoice | null;
  onSelectProcessor: (processor: PaymentProcessorChoice) => void;
  payments: UnifiedProvider[];
  cardProps: {
    onConnect: (p: UnifiedProvider) => void;
    onDisconnect: (p: UnifiedProvider) => void;
    onSync: (p: ProviderConnectionView) => void;
    onUpload: (p: ProviderConnectionView) => void;
    busyId: string | null;
  };
}) {
  const processorProviderId: Record<PaymentProcessorChoice, string | null> = {
    stripe: 'stripe',
    paypal: 'paypal',
    adyen: 'adyen',
    other: null,
  };

  const activeProcessor = selectedProcessor ?? inferredProcessor;
  const highlightedProviderId = activeProcessor ? processorProviderId[activeProcessor] : null;
  const highlightedProviders = highlightedProviderId
    ? payments.filter((provider) => provider.id === highlightedProviderId)
    : [];

  return (
    <section
      id="payments-disputes"
      className="scroll-mt-6 rounded-xl border px-5 py-5"
      style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
    >
      <div className="mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Payments & disputes</p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Dispute and chargeback evidence depends on your payment processor. Every merchant has exactly one — this is not optional enrichment.
        </p>
      </div>

      {shopifyPaymentsCovered === true ? (
        <div
          className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs"
          style={{
            borderColor: 'color-mix(in srgb, var(--success) 25%, var(--border))',
            background: 'color-mix(in srgb, var(--success) 6%, var(--surface))',
            color: 'var(--text-secondary)',
          }}
        >
          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--success)' }} />
          <span>You&apos;re on Shopify Payments — dispute and chargeback evidence is already covered. No action needed.</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Which payment processor do you use?
            </p>
            {shopifyPaymentsCovered === false ? (
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Shopify Payments is not active on your store — connect the processor you actually settle through.
              </p>
            ) : (
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Confirm your processor so dispute evidence can be routed correctly when connectors go live.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_PROCESSOR_OPTIONS.map((option) => {
              const active = activeProcessor === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectProcessor(option.id)}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                  style={{
                    borderColor: active ? 'var(--text)' : 'var(--border-muted)',
                    background: active ? 'var(--text)' : 'var(--surface)',
                    color: active ? 'var(--surface)' : 'var(--text)',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,.15)' : 'none',
                  }}
                >
                  {option.label}
                  {inferredProcessor === option.id && !selectedProcessor ? ' (detected)' : ''}
                  {active && selectedProcessor ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
          {activeProcessor ? (
            <div className="space-y-2">
              {activeProcessor ? (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Your processor is recorded. Dispute and chargeback evidence will populate automatically once a connector for your processor is live.
                </p>
              ) : null}
              {highlightedProviders.length > 0 ? (
                <ProviderGrid>
                  {highlightedProviders.map((provider) => (
                    <ProviderCard key={provider.id} provider={provider} {...cardProps} />
                  ))}
                </ProviderGrid>
              ) : null}
            </div>
          ) : null}
          <RequestIntegrationLink subject="Integration request: payment processor" />
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function resolveApplicabilityState(
  rows: Array<{ category: string; status: string; setAt: string | null }>,
  category: ApplicabilityCategory,
): ApplicabilityState {
  const row = rows.find((entry) => entry.category === category);
  // A row with null setAt is synthesised by the server as a default — the merchant
  // has never actually answered. Treat that the same as a missing row.
  if (!row || !row.setAt) return 'pending';
  return row.status === 'not_applicable' ? 'not_applicable' : 'applicable';
}

export default function IntegrationHubClient() {
  const { data: hubData, loading: hubLoading, error: hubError, reload: reloadHub } = useFetchJson<IntegrationsResponse>('/api/integrations');
  const { data: setupStatus, reload: reloadSetup } = useAsyncResource('integrations-setup-status', fetchIntegrationConnectionStatus);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [shopifyModalOpen, setShopifyModalOpen] = useState(false);
  const [popupError, setPopupError] = useState<string | null>(null);
  const [connectTarget, setConnectTarget] = useState<UnifiedProvider | null>(null);
  const [syncTarget, setSyncTarget] = useState<ProviderConnectionView | null>(null);
  const [uploadTarget, setUploadTarget] = useState<ProviderConnectionView | null>(null);
  const [expandOrderSource, setExpandOrderSource] = useState(false);
  const [expandHelpdesk, setExpandHelpdesk] = useState(false);
  // Warehouse/3PL connectors are supported setup choices, so keep this section
  // visible instead of hiding the only ShipBob entry behind an extra click.
  const [stackOpen, setStackOpen] = useState(true);
  const [warehouseEditing, setWarehouseEditing] = useState(false);
  const [returnsEditing, setReturnsEditing] = useState(false);
  const [applicabilityBusy, setApplicabilityBusy] = useState<ApplicabilityCategory | null>(null);
  const [selectedPaymentProcessor, setSelectedPaymentProcessor] = useState<PaymentProcessorChoice | null>(
    (hubData?.paymentSetup?.processorSelection ?? null),
  );
  const popupRef = useRef<Window | null>(null);

  const providers: ProviderConnectionView[] = hubData?.providers ?? [];
  const categoryApplicability = hubData?.categoryApplicability ?? [];
  const paymentSetup = hubData?.paymentSetup;

  const warehouseApplicability = useMemo(
    () => resolveApplicabilityState(categoryApplicability, 'warehouse_3pl'),
    [categoryApplicability],
  );
  const returnsApplicability = useMemo(
    () => resolveApplicabilityState(categoryApplicability, 'returns'),
    [categoryApplicability],
  );

  const warehouseNotApplicable = warehouseApplicability === 'not_applicable';

  // Map dynamic providers by id
  const byId = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);

  function dynamicToUnified(id: string): UnifiedProvider | null {
    const p = byId.get(id);
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? p.evidenceCapabilities.map((c) => c.replaceAll('_', ' ')).join(', '),
      logo: PROVIDER_LOGOS[p.id] ?? '/integrations/carrier-claims.svg',
      connected: p.buildStatus !== 'slot_only' && p.status === 'connected',
      connectionIssue: p.status === 'connection_error' || p.status === 'error' || p.status === 'degraded' || p.status === 'revoked',
      detail: p.detail,
      comingSoon: p.buildStatus === 'slot_only',
      dynamic: p,
      ...(p.id === 'shipbob' ? { href: '/api/integrations/shipbob/install?environment=sandbox' } : {}),
    };
  }

  // ---------------------------------------------------------------------------
  // Build section groups
  // ---------------------------------------------------------------------------

  // Order source
  const orderSource: UnifiedProvider[] = [
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Sync orders, customers, refunds and fulfilment in real time.',
      logo: '/integrations/shopify.svg',
      connected: setupStatus?.shopify.connected ?? false,
      connectionIssue: setupStatus?.shopify.connectionIssue ?? false,
      detail: setupStatus?.shopify.detail ?? null,
      href: '/settings/integrations/shopify',
      isShopify: true,
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      description: 'WooCommerce order and customer sync is coming soon.',
      logo: '/integrations/woocommerce.svg',
      connected: false,
      connectionIssue: false,
      detail: null,
      comingSoon: true,
    },
    {
      id: 'bigcommerce',
      name: 'BigCommerce',
      description: 'BigCommerce order and customer sync is coming soon.',
      logo: '/integrations/bigcommerce.svg',
      connected: false,
      connectionIssue: false,
      detail: null,
      comingSoon: true,
    },
  ];

  // Helpdesk
  const helpdesk: UnifiedProvider[] = [
    {
      id: 'gorgias',
      name: 'Gorgias',
      description: 'Show payout exposure, evidence, and recovery routes inside your ticket sidebar.',
      logo: '/integrations/gorgias.png',
      connected: setupStatus?.gorgias.connected ?? false,
      connectionIssue: setupStatus?.gorgias.connectionIssue ?? false,
      detail: setupStatus?.gorgias.detail ?? null,
      href: '/settings/integrations/gorgias',
    },
    {
      id: 'freshdesk',
      name: 'Freshdesk',
      description: 'Surface order history and trust signals inside Freshdesk tickets.',
      logo: '/integrations/freshdesk.png',
      connected: setupStatus?.freshdesk.connected ?? false,
      connectionIssue: setupStatus?.freshdesk.connectionIssue ?? false,
      detail: setupStatus?.freshdesk.detail ?? null,
      href: '/settings/integrations/freshdesk',
    },
    {
      id: 'zendesk',
      name: 'Zendesk',
      description: 'Install the Zendesk sidebar app for in-ticket payout context.',
      logo: '/integrations/zendesk.svg',
      connected: setupStatus?.zendesk.connected ?? false,
      connectionIssue: setupStatus?.zendesk.connectionIssue ?? false,
      detail: setupStatus?.zendesk.detail ?? null,
      href: '/settings/integrations/zendesk',
    },
  ];

  // Tracking & proof
  // Only render tiles for providers whose integration is actually built
  // (buildStatus === 'live'). Slot-only providers flip on automatically when
  // their registry entry goes live.
  const trackingProof = useMemo(() => {
    return ['aftership', 'ups', 'fedex'].flatMap((id) => {
      const u = dynamicToUnified(id);
      return u && !u.comingSoon ? [u] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId]);

  // Logistics
  const logistics = useMemo(() => {
    return ['shipbob'].flatMap((id) => {
      const u = dynamicToUnified(id);
      return u && !u.comingSoon ? [u] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId]);

  // Returns — no returns-platform provider is currently built.
  const returns: UnifiedProvider[] = [];

  // Payments & disputes
  const carrierClaimsRaw = dynamicToUnified('carrier_claims');
  const carrierClaims = carrierClaimsRaw && !carrierClaimsRaw.comingSoon ? carrierClaimsRaw : null;

  const payments = useMemo(() => {
    return ['stripe'].flatMap((id) => {
      const u = dynamicToUnified(id);
      return u && !u.comingSoon ? [u] : [];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId]);

  // Documents
  const documentUpload = dynamicToUnified('document_upload');

  // Self-fulfillment (only when warehouse 3PL is not applicable)
  const selfFulfillment = warehouseNotApplicable ? dynamicToUnified('self_fulfillment_pack') : null;

  // Connected store / helpdesk names for banner
  const connectedStoreName = setupStatus?.shopify.connected ? 'Shopify' : null;

  const connectedHelpdeskName = setupStatus?.gorgias.connected ? 'Gorgias'
    : setupStatus?.freshdesk.connected ? 'Freshdesk'
    : setupStatus?.zendesk.connected ? 'Zendesk'
    : null;

  const storeConnected = Boolean(connectedStoreName);
  const helpdeskConnected = Boolean(connectedHelpdeskName);

  // ---------------------------------------------------------------------------
  // Shopify OAuth
  // ---------------------------------------------------------------------------

  const openShopifyPopup = useCallback((shop: string) => {
    setShopifyModalOpen(false);
    setPopupError(null);
    const w = 600, h = 700;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    const popup = window.open(
      `/api/shopify/install?shop=${encodeURIComponent(shop)}`,
      'shopify_oauth',
      `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`,
    );
    if (!popup) {
      setPopupError('Pop-up blocked. Allow pop-ups for this site and try again.');
      setShopifyModalOpen(true);
      return;
    }
    popupRef.current = popup;
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; success?: boolean; error?: string | null };
      if (data?.type !== 'shopify_oauth_complete') return;
      popupRef.current = null;
      if (data.success) {
        reloadSetup();
      } else {
        setPopupError(
          data.error === 'invalid_shop' ? 'Invalid store domain. Check the URL and try again.'
            : data.error === 'public_domain' ? 'Enter your .myshopify.com store domain, not a custom domain.'
            : 'Shopify authorisation failed. Please try again.',
        );
        setShopifyModalOpen(true);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [reloadSetup]);

  // Surface the result of the ShipBob OAuth redirect instead of leaving the
  // merchant to infer success from a silent page refresh.
  useEffect(() => {
    // ShipBob's OpenID flow returns the authorization code in the URL *fragment*
    // (#code=…&state=…) because the response also carries an id_token, which OIDC
    // forces into the fragment. Fragments never reach the server, so the callback
    // route sees no code and returns shipbob_missing_params. Harvest the code
    // client-side and relay it to the server callback as query params so the
    // token exchange can complete. This is mode-agnostic: if ShipBob ever returns
    // the code in the query string, the server callback handles it directly and
    // this branch is skipped.
    const rawHash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    if (rawHash) {
      const frag = new URLSearchParams(rawHash);
      const fragCode = frag.get('code');
      const fragState = frag.get('state');
      const fragError = frag.get('error');
      if ((fragCode && fragState) || fragError) {
        const relay = new URL('/api/integrations/shipbob/callback', window.location.origin);
        if (fragCode) relay.searchParams.set('code', fragCode);
        if (fragState) relay.searchParams.set('state', fragState);
        if (fragError) relay.searchParams.set('error', fragError);
        // Clear the fragment first so it cannot linger in history after the relay.
        window.location.replace(relay.toString());
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const messages: Array<[string, string]> = [
      ['shipbob_warning', 'ShipBob connected, but webhook setup needs attention. The connection remains visible as degraded.'],
      ['shipbob_connected', 'ShipBob connected. Webhook coverage is being checked and the initial import has started.'],
      ['shipbob_callback_failed', 'ShipBob authorisation could not be completed. Please try Connect ShipBob again.'],
      ['shipbob_authorization_denied', 'ShipBob authorisation was cancelled or denied.'],
      ['shipbob_invalid_state', 'ShipBob authorisation expired. Please start the connection again.'],
      ['shipbob_identity_mismatch', 'ShipBob was authorised for a different Unauth session or workspace. Sign in again and reconnect.'],
      ['shipbob_unauthorized', 'You must be signed in to Unauth before connecting ShipBob.'],
      ['shipbob_forbidden', 'Your Unauth account does not have permission to manage integrations.'],
      ['shipbob_missing_merchant', 'Your Unauth workspace could not be resolved. Contact support before reconnecting ShipBob.'],
      ['shipbob_missing_params', 'ShipBob did not return an authorisation code. Please try again.'],
      ['shipbob_misconfigured', 'ShipBob is not configured on the deployment yet.'],
    ];
    const message = messages.find(([key]) => params.has(key));
    if (!message) return;
    const reason = params.get('shipbob_reason');
    setToast(reason ? `${message[1]} (${reason})` : message[1]);
    reloadHub();
    window.history.replaceState({}, '', window.location.pathname);
  }, [reloadHub]);

  // Sync processor selection from API once data loads (useState initial value is null before fetch)
  useEffect(() => {
    const saved = hubData?.paymentSetup?.processorSelection ?? null;
    if (saved && !selectedPaymentProcessor) {
      setSelectedPaymentProcessor(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubData?.paymentSetup?.processorSelection]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function postJson(path: string, body: Record<string, unknown> = {}) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((payload as { error?: string }).error ?? 'Request failed');
    return payload;
  }

  async function submitProcessorSelection(processor: PaymentProcessorChoice) {
    setSelectedPaymentProcessor(processor);
    try {
      await postJson('/api/integrations', { processorSelection: processor });
    } catch {
      // Non-critical — UI already updated; silent failure is acceptable here.
    }
  }

  async function submitApplicability(
    category: ApplicabilityCategory,
    status: 'applicable' | 'not_applicable',
  ) {
    setApplicabilityBusy(category);
    try {
      await postJson('/api/integrations/applicability', { category, status });
      if (category === 'warehouse_3pl') setWarehouseEditing(false);
      if (category === 'returns') setReturnsEditing(false);
      setToast(status === 'not_applicable' ? 'Saved — this category is marked as not applicable.' : 'Saved — choose a provider below.');
      reloadHub();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Could not save your answer.');
    } finally {
      setApplicabilityBusy(null);
    }
  }

  function handleConnect(provider: UnifiedProvider) {
    if (provider.isShopify) { setShopifyModalOpen(true); return; }
    if (provider.href) { window.location.href = provider.href; return; }
    setConnectTarget(provider);
  }

  function handleDisconnect(provider: UnifiedProvider) {
    void (async () => {
      setBusyId(provider.id);
      try {
        await postJson(`/api/integrations/${provider.id}/disconnect`);
        setToast(`${provider.name} disconnected.`);
        reloadHub();
        reloadSetup();
      } catch (err) {
        setToast(err instanceof Error ? err.message : 'Disconnect failed.');
      } finally {
        setBusyId(null);
      }
    })();
  }

  async function submitConnect(payload: Record<string, string>) {
    if (!connectTarget) return;
    setBusyId(connectTarget.id);
    try {
      const path = connectTarget.id === 'aftership' || connectTarget.id === 'shipbob'
        ? `/api/integrations/${connectTarget.id}/api-key`
        : `/api/integrations/${connectTarget.id}/connect`;
      await postJson(path, payload);
      setToast(`${connectTarget.name} connected.`);
      setConnectTarget(null);
      reloadHub();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function submitSync(payload: Record<string, string>) {
    if (!syncTarget) return;
    setBusyId(syncTarget.id);
    try {
      await postJson(`/api/integrations/${syncTarget.id}/sync`, Object.fromEntries(
        Object.entries(payload).filter(([, v]) => v.trim()),
      ));
      setToast(`${syncTarget.name} sync complete.`);
      setSyncTarget(null);
      reloadHub();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setBusyId(null);
    }
  }

  async function submitUpload(fd: FormData) {
    if (!uploadTarget) return;
    setBusyId(uploadTarget.id);
    try {
      const res = await fetch('/api/integrations/documents/upload', { method: 'POST', body: fd });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((payload as { error?: string }).error ?? 'Upload failed');
      setToast('Document uploaded. Approve extracted terms before applying to rules.');
      setUploadTarget(null);
      reloadHub();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusyId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const cardProps = {
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onSync: setSyncTarget,
    onUpload: setUploadTarget,
    busyId,
  };

  const trackingConnected = trackingProof.some((p) => p.connected);
  const connectedStore = orderSource.find((p) => p.connected && !p.comingSoon) ?? null;
  const connectedHelpdesk = helpdesk.find((p) => p.connected) ?? null;
  const connectedTracking = trackingProof.find((p) => p.connected) ?? null;
  const connectedWarehouse = logistics.find((p) => p.connected) ?? null;

  if (hubLoading && providers.length === 0 && !setupStatus) {
    return (
      <div className="space-y-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'var(--border)' }} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-44 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast ? (
        <div
          className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm"
          style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} style={{ color: 'var(--text-secondary)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Popup error */}
      {popupError ? (
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3"
          style={{
            borderColor: 'color-mix(in srgb, var(--risk-critical) 30%, var(--border))',
            background: 'color-mix(in srgb, var(--risk-critical) 6%, var(--surface))',
          }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--risk-critical)' }} />
          <p className="text-sm flex-1" style={{ color: 'var(--text)' }}>{popupError}</p>
          <button type="button" onClick={() => setPopupError(null)} style={{ color: 'var(--text-secondary)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* Hub error */}
      {hubError ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--warning) 30%, var(--border))',
            background: 'color-mix(in srgb, var(--warning) 6%, var(--surface))',
            color: 'var(--warning)',
          }}
        >
          Could not load integration status: {hubError}
        </div>
      ) : null}

      {/* Fix 1: Progress checklist */}
      <SetupProgressChecklist
        storeConnected={storeConnected}
        storeName={connectedStoreName}
        storeDetail={connectedStore?.detail ?? null}
        helpdeskConnected={helpdeskConnected}
        helpdeskName={connectedHelpdeskName}
        helpdeskDetail={connectedHelpdesk?.detail ?? null}
        trackingConnected={trackingConnected}
        trackingName={connectedTracking?.name ?? null}
        warehouseConnected={Boolean(connectedWarehouse)}
        warehouseName={connectedWarehouse?.name ?? null}
      />

      {/* Required: Order source + Helpdesk */}
      <div
        className="rounded-xl border px-5 py-4 space-y-4"
        style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
      >
        <RequiredCategorySection
          title="Order source"
          description="Sync orders, customers, refunds and fulfilment. Pick one — the others stay available."
          satisfied={storeConnected}
          connectedProvider={connectedStore}
          expanded={expandOrderSource}
          onToggleExpand={() => setExpandOrderSource((v) => !v)}
        >
          <ProviderGrid>
            {orderSource.map((p) => <ProviderCard key={p.id} provider={p} {...cardProps} />)}
          </ProviderGrid>
          <RequestIntegrationLink subject="Integration request: order source" />
        </RequiredCategorySection>

        <RequiredCategorySection
          title="Helpdesk"
          description="Surface payout exposure, evidence, and recommended actions inside every support ticket. Pick one."
          satisfied={helpdeskConnected}
          connectedProvider={connectedHelpdesk}
          expanded={expandHelpdesk}
          onToggleExpand={() => setExpandHelpdesk((v) => !v)}
        >
          <ProviderGrid>
            {helpdesk.map((p) => <ProviderCard key={p.id} provider={p} {...cardProps} />)}
          </ProviderGrid>
          <RequestIntegrationLink subject="Integration request: helpdesk" />
        </RequiredCategorySection>
      </div>

      {/* Fix 4: Tracking & proof — visually prominent, connectable now */}
      {trackingProof.length > 0 ? (
        <section
          id="tracking-proof"
          className="scroll-mt-6 rounded-xl border px-5 py-5"
          style={{
            borderColor: trackingConnected
              ? 'color-mix(in srgb, var(--success) 30%, var(--border))'
              : 'color-mix(in srgb, var(--warning) 35%, var(--border))',
            background: trackingConnected
              ? 'color-mix(in srgb, var(--success) 4%, var(--surface))'
              : 'color-mix(in srgb, var(--warning) 5%, var(--surface))',
            boxShadow: trackingConnected
              ? 'none'
              : '0 0 0 1px color-mix(in srgb, var(--warning) 12%, transparent)',
          }}
        >
          <div className="mb-4">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Tracking & proof
              {!trackingConnected ? (
                <span className="ml-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--warning)' }}>
                  Recommended next
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Connect AfterShip to add delivery scans, shipment status, exceptions, and delivery dates to INR cases. Photo, signature, and GPS proof require UPS or FedEx.
            </p>
          </div>
          {!trackingConnected ? (
            <div
              className="mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs"
              style={{
                borderColor: 'color-mix(in srgb, var(--warning) 25%, var(--border))',
                background: 'color-mix(in srgb, var(--warning) 8%, var(--surface))',
                color: 'var(--text-secondary)',
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--warning)' }} />
              <span>Connect AfterShip to add delivery scans, shipment status, exceptions, and delivery dates to INR cases.</span>
            </div>
          ) : null}
          <ProviderGrid>
            {trackingProof.map((p) => <ProviderCard key={p.id} provider={p} {...cardProps} />)}
          </ProviderGrid>
        </section>
      ) : null}

      {/* Payments & disputes — own section, not bundled with WMS/Returns */}
      <PaymentsDisputesSection
          shopifyPaymentsCovered={paymentSetup?.shopifyPaymentsCovered ?? null}
          inferredProcessor={paymentSetup?.inferredProcessor ?? null}
          selectedProcessor={selectedPaymentProcessor}
          onSelectProcessor={(p) => void submitProcessorSelection(p)}
          payments={payments}
          cardProps={cardProps}
        />

      {/* Contract documents — connectable, lower emphasis than tracking */}
      {documentUpload ? (
        <section
          className="rounded-xl border px-5 py-5"
          style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
        >
          <CategoryHeader
            title="Contract documents"
            description="Upload carrier agreements, 3PL SLAs, and supplier terms. Extracted terms stay inactive until approved."
            satisfied={documentUpload.connected}
          />
          <ProviderGrid>
            <ProviderCard provider={documentUpload} {...cardProps} />
          </ProviderGrid>
        </section>
      ) : null}

      {/* Self-fulfilment (conditional) */}
      {selfFulfillment ? (
        <section
          className="rounded-xl border px-5 py-5"
          style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
        >
          <CategoryHeader
            title="Self-fulfilment"
            description="Request low-confidence pack confirmation from your team via a signed link."
            satisfied={selfFulfillment.connected}
          />
          <ProviderGrid>
            <ProviderCard provider={selfFulfillment} {...cardProps} />
          </ProviderGrid>
        </section>
      ) : null}

      {/* Warehouse, Returns, carrier claims */}
      {(logistics.length > 0 || returns.length > 0 || carrierClaims) ? (
        <section
          id="stack-setup"
          className="scroll-mt-6 rounded-xl border"
          style={{ borderColor: 'var(--border-muted)', background: 'var(--surface)' }}
        >
          <button
            type="button"
            onClick={() => setStackOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            style={{
              borderBottom: stackOpen ? '1px solid var(--border-muted)' : 'none',
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Warehouse & 3PL
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Connect ShipBob when a warehouse or 3PL fulfils your orders. Returns and carrier claims are managed here when available.
              </p>
            </div>
            {stackOpen
              ? <ChevronUp className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
              : <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />}
          </button>
          {stackOpen ? (
            <div className="space-y-6 px-5 py-5">
              {logistics.length > 0 ? (
                <CategoryApplicabilityQuestion
                  question="Do you use a warehouse or 3PL?"
                  yesLabel="I use one — show me providers"
                  noLabel="No, we self-fulfil"
                  notApplicableMessage="Marked as not applicable — pick/pack evidence won't appear on your cases."
                  applicableAnswerLabel="Using a 3PL"
                  state={warehouseApplicability}
                  busy={applicabilityBusy === 'warehouse_3pl'}
                  editing={warehouseEditing}
                  onUseOne={() => void submitApplicability('warehouse_3pl', 'applicable')}
                  onNotApplicable={() => void submitApplicability('warehouse_3pl', 'not_applicable')}
                  onChangeDecision={() => setWarehouseEditing(true)}
                >
                  <ProviderGrid>
                    {logistics.map((provider) => (
                      <ProviderCard key={provider.id} provider={provider} {...cardProps} />
                    ))}
                  </ProviderGrid>
                </CategoryApplicabilityQuestion>
              ) : null}

              {returns.length > 0 ? (
                <CategoryApplicabilityQuestion
                  question="Do you use a dedicated returns platform?"
                  yesLabel="I use one — show me providers"
                  noLabel="No, we handle returns manually"
                  notApplicableMessage="Marked as not applicable — return inspection evidence won't appear on your cases."
                  applicableAnswerLabel="Using a returns platform"
                  state={returnsApplicability}
                  busy={applicabilityBusy === 'returns'}
                  editing={returnsEditing}
                  onUseOne={() => void submitApplicability('returns', 'applicable')}
                  onNotApplicable={() => void submitApplicability('returns', 'not_applicable')}
                  onChangeDecision={() => setReturnsEditing(true)}
                >
                  <ProviderGrid>
                    {returns.map((provider) => (
                      <ProviderCard key={provider.id} provider={provider} {...cardProps} />
                    ))}
                  </ProviderGrid>
                </CategoryApplicabilityQuestion>
              ) : null}

              {carrierClaims ? (
                <div
                  className="border-t pt-4"
                  style={{ borderColor: 'var(--border-muted)' }}
                >
                  <p className="mb-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Carrier claims
                  </p>
                  <SlotProviderLine provider={carrierClaims} />
                </div>
              ) : null}

              <RequestIntegrationLink subject="Integration request: warehouse, returns, or carrier" />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Modals */}
      <ShopifyModal
        open={shopifyModalOpen}
        onClose={() => { setShopifyModalOpen(false); setPopupError(null); }}
        onOpen={openShopifyPopup}
      />
      <ConnectModal
        target={connectTarget}
        busy={busyId === connectTarget?.id}
        onClose={() => setConnectTarget(null)}
        onSubmit={submitConnect}
      />
      <SyncModal
        target={syncTarget}
        busy={busyId === syncTarget?.id}
        onClose={() => setSyncTarget(null)}
        onSubmit={submitSync}
      />
      <DocumentUploadModal
        target={uploadTarget}
        busy={busyId === uploadTarget?.id}
        onClose={() => setUploadTarget(null)}
        onSubmit={submitUpload}
      />
    </div>
  );
}
