'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, X, Zap } from 'lucide-react';
import { PanelCard, StatusBadge } from '@/components/ui';
import { useAsyncResource } from '@/lib/react/useFetchJson';
import { fetchIntegrationConnectionStatus } from '@/components/settings/fetchIntegrationConnectionStatus';
import type { IntegrationsSetupStatus } from '@/components/settings/apiIntegrationsTypes';

type CommercePlatformId = 'shopify' | 'woocommerce' | 'bigcommerce' | 'magento';
type HelpdeskPlatformId = 'gorgias' | 'freshdesk' | 'zendesk';

type Platform = {
  name: string;
  description: string;
  href: string;
  logo: string;
  available: boolean;
};

const COMMERCE_PLATFORMS: (Platform & { id: CommercePlatformId })[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Sync orders, customers, refunds and fulfillment in real time',
    href: '/settings/integrations/shopify',
    logo: '/integrations/shopify.svg',
    available: true,
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Pull order and customer data from your WordPress store',
    href: '/settings/integrations/woocommerce',
    logo: '/integrations/woocommerce.svg',
    available: true,
  },
  {
    id: 'bigcommerce',
    name: 'BigCommerce',
    description: 'Connect your BigCommerce storefront to sync orders and customers',
    href: '/settings/integrations/bigcommerce',
    logo: '/integrations/bigcommerce.svg',
    available: true,
  },
  {
    id: 'magento',
    name: 'Magento',
    description: 'Connect Adobe Commerce to monitor orders and customer identity',
    href: '#',
    logo: '/integrations/magento.svg',
    available: false,
  },
];

const HELPDESK_PLATFORMS: (Platform & { id: HelpdeskPlatformId })[] = [
  {
    id: 'gorgias',
    name: 'Gorgias',
    description: 'Show payout exposure, evidence, and recovery routes inside your Gorgias ticket sidebar',
    href: '/settings/integrations/gorgias',
    logo: '/integrations/gorgias.png',
    available: true,
  },
  {
    id: 'freshdesk',
    name: 'Freshdesk',
    description: 'Surface order history and trust signals inside Freshdesk tickets',
    href: '/settings/integrations/freshdesk',
    logo: '/integrations/freshdesk.svg',
    available: true,
  },
  {
    id: 'zendesk',
    name: 'Zendesk',
    description: 'Install the Zendesk sidebar app for in-ticket claim context',
    href: '/settings/integrations/zendesk',
    logo: '/integrations/zendesk.svg',
    available: true,
  },
];

function getCommerceState(
  id: CommercePlatformId,
  status: IntegrationsSetupStatus,
): { connected: boolean; connectionIssue: boolean; detail: string | null } {
  if (id === 'shopify') return { connected: status.shopify.connected, connectionIssue: Boolean(status.shopify.connectionIssue), detail: status.shopify.detail };
  if (id === 'woocommerce') return { connected: status.woocommerce.connected, connectionIssue: false, detail: status.woocommerce.detail };
  if (id === 'bigcommerce') return { connected: status.bigcommerce.connected, connectionIssue: false, detail: status.bigcommerce.detail };
  return { connected: false, connectionIssue: false, detail: null };
}

function getHelpdeskState(
  id: HelpdeskPlatformId,
  status: IntegrationsSetupStatus,
): { connected: boolean; connectionIssue: boolean; detail: string | null } {
  if (id === 'gorgias') return { connected: status.gorgias.connected, connectionIssue: Boolean(status.gorgias.connectionIssue), detail: status.gorgias.detail };
  if (id === 'freshdesk') return { connected: status.freshdesk.connected, connectionIssue: Boolean(status.freshdesk.connectionIssue), detail: status.freshdesk.detail };
  if (id === 'zendesk') return { connected: status.zendesk.connected, connectionIssue: Boolean(status.zendesk.connectionIssue), detail: status.zendesk.detail };
  return { connected: false, connectionIssue: false, detail: null };
}

function IntegrationCard({
  logo,
  name,
  description,
  href,
  connected,
  connectionIssue,
  detail,
  available,
  onConnect,
}: {
  logo: string;
  name: string;
  description: string;
  href: string;
  connected: boolean;
  connectionIssue: boolean;
  detail: string | null;
  available: boolean;
  onConnect?: () => void;
}) {
  const badge = connected ? (
    <StatusBadge variant="cleared" className="px-2 py-0.5 text-xs font-medium">
      Connected
    </StatusBadge>
  ) : connectionIssue ? (
    <StatusBadge variant="flagged" className="px-2 py-0.5 text-xs font-medium">
      Issue
    </StatusBadge>
  ) : !available ? (
    <StatusBadge variant="held" className="px-2 py-0.5 text-xs font-medium uppercase tracking-wide" dot={false}>
      Soon
    </StatusBadge>
  ) : null;

  const cta = available ? (
    connected ? (
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        Manage
      </Link>
    ) : connectionIssue ? (
      onConnect ? (
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{
            borderColor: 'color-mix(in srgb, var(--warning) 40%, var(--border))',
            color: 'var(--warning)',
          }}
        >
          Reconnect
          <ArrowRight className="h-3 w-3" />
        </button>
      ) : (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
          style={{
            borderColor: 'color-mix(in srgb, var(--warning) 40%, var(--border))',
            color: 'var(--warning)',
          }}
        >
          Reconnect
          <ArrowRight className="h-3 w-3" />
        </Link>
      )
    ) : onConnect ? (
      <button
        type="button"
        onClick={onConnect}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
      >
        Connect
        <ArrowRight className="h-3 w-3" />
      </button>
    ) : (
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
      >
        Connect
        <ArrowRight className="h-3 w-3" />
      </Link>
    )
  ) : (
    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
      Coming soon
    </span>
  );

  return (
    <PanelCard
      variant="app"
      className="flex flex-col p-4"
      style={{
        borderColor: connected
          ? 'color-mix(in srgb, var(--success) 35%, var(--border))'
          : connectionIssue
          ? 'color-mix(in srgb, var(--warning) 35%, var(--border))'
          : 'var(--border)',
        background: connected
          ? 'color-mix(in srgb, var(--success) 3%, var(--surface))'
          : connectionIssue
          ? 'color-mix(in srgb, var(--warning) 3%, var(--surface))'
          : 'var(--surface)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <Image src={logo} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
        {badge}
      </div>

      <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
        {name}
      </p>
      {(connected || connectionIssue) && detail ? (
        <p className="text-xs mb-2 truncate" style={{ color: 'var(--text-secondary)' }}>
          {detail}
        </p>
      ) : null}
      {connectionIssue && !connected ? (
        <p className="text-xs mb-2 leading-relaxed" style={{ color: 'var(--warning)' }}>
          Connection lost — token may have been revoked. Reconnect to restore.
        </p>
      ) : (
        <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}

      <div className="mt-4">{cta}</div>
    </PanelCard>
  );
}

function StepSection({
  number,
  title,
  subtitle,
  complete,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  complete: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: complete ? 'var(--success)' : 'var(--surface)',
            color: complete ? 'white' : 'var(--text-secondary)',
            border: complete ? 'none' : '1.5px solid var(--border)',
          }}
        >
          {complete ? <CheckCircle2 className="h-4 w-4" /> : <span>{number}</span>}
        </div>
        <div className="mt-2 w-px flex-1 min-h-4" style={{ background: 'var(--border)' }} />
      </div>

      <div className="flex-1 pb-8 min-w-0">
        <div className="mb-4 mt-0.5">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            {title}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function LiveBanner({ storeName, helpdeskName }: { storeName: string; helpdeskName: string }) {
  return (
    <PanelCard
      variant="app"
      className="mb-8 flex items-center gap-3 px-4 py-3"
      style={{
        borderColor: 'color-mix(in srgb, var(--success) 30%, var(--border))',
        background: 'color-mix(in srgb, var(--success) 4%, var(--surface))',
      }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)' }}
      >
        <Zap className="h-4 w-4" style={{ color: 'var(--success)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Claim intelligence is active
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {storeName} and {helpdeskName} are connected. Agents see order history, trust indicators and prior claims inside every ticket.
        </p>
      </div>
    </PanelCard>
  );
}

function ShopifyConnectModal({
  open,
  onClose,
  onPopupOpen,
}: {
  open: boolean;
  onClose: () => void;
  onPopupOpen: (shop: string) => void;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) { setError('Enter your Shopify store domain.'); return; }
    onPopupOpen(raw);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <Image src="/integrations/shopify.svg" alt="Shopify" width={36} height={36} className="h-9 w-9 rounded-lg" />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connect Shopify</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Opens Shopify login to authorise</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="shopify-domain-input"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text)' }}
            >
              Your Shopify store domain
            </label>
            <input
              id="shopify-domain-input"
              ref={inputRef}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              placeholder="yourstore or yourstore.myshopify.com"
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: 'var(--bg-inset)',
                border: `1px solid ${error ? 'var(--risk-critical)' : 'var(--border)'}`,
                color: 'var(--text)',
              }}
            />
            {error ? (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--risk-critical)' }}>{error}</p>
            ) : (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Shopify will open in a new window so you don&apos;t lose your place.
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

export default function IntegrationsSetupClient() {
  const { data: status, reload } = useAsyncResource('integrations-setup-status', fetchIntegrationConnectionStatus);
  const [shopifyModalOpen, setShopifyModalOpen] = useState(false);
  const [popupError, setPopupError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

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
        reload();
      } else {
        setPopupError(
          data.error === 'invalid_shop' ? 'Invalid store domain. Check the URL and try again.' :
          data.error === 'public_domain' ? 'Enter your .myshopify.com store domain, not a custom domain.' :
          'Shopify authorisation failed. Please try again.',
        );
        setShopifyModalOpen(true);
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [reload]);

  if (!status) {
    return (
      <div className="space-y-6">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-5">
            <div className="h-8 w-8 shrink-0 rounded-full animate-pulse" style={{ background: 'var(--border)' }} />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="h-36 rounded-xl animate-pulse" style={{ background: 'var(--border)' }} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const orderSourceConnected =
    status.shopify.connected || status.woocommerce.connected || status.bigcommerce.connected;
  const helpdeskConnected =
    status.gorgias.connected || status.freshdesk.connected || status.zendesk.connected;

  const connectedStoreName = status.shopify.connected
    ? 'Shopify'
    : status.woocommerce.connected
    ? 'WooCommerce'
    : status.bigcommerce.connected
    ? 'BigCommerce'
    : null;

  const connectedHelpdeskName = status.gorgias.connected
    ? 'Gorgias'
    : status.freshdesk.connected
    ? 'Freshdesk'
    : status.zendesk.connected
    ? 'Zendesk'
    : null;

  return (
    <>
      <ShopifyConnectModal
        open={shopifyModalOpen}
        onClose={() => { setShopifyModalOpen(false); setPopupError(null); }}
        onPopupOpen={openShopifyPopup}
      />

      {popupError ? (
        <PanelCard
          variant="appInset"
          className="mb-6 flex items-start gap-3 px-4 py-3"
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
        </PanelCard>
      ) : null}

      <div>
        {orderSourceConnected && helpdeskConnected && connectedStoreName && connectedHelpdeskName ? (
          <LiveBanner storeName={connectedStoreName} helpdeskName={connectedHelpdeskName} />
        ) : null}

        <StepSection
          number={1}
          title="Connect your store"
          subtitle="Sync orders, customers, refunds and fulfillment so Unauth has the context it needs."
          complete={orderSourceConnected}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COMMERCE_PLATFORMS.map((platform) => {
              const { connected, connectionIssue, detail } = getCommerceState(platform.id, status);
              return (
                <IntegrationCard
                  key={platform.id}
                  logo={platform.logo}
                  name={platform.name}
                  description={platform.description}
                  href={platform.href}
                  connected={connected}
                  connectionIssue={connectionIssue}
                  detail={detail}
                  available={platform.available}
                  onConnect={platform.id === 'shopify' ? () => setShopifyModalOpen(true) : undefined}
                />
              );
            })}
          </div>
        </StepSection>

        <StepSection
          number={2}
          title="Connect your helpdesk"
          subtitle="Surface payout exposure, evidence, merchant rules, and recovery routes inside support tickets."
          complete={helpdeskConnected}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {HELPDESK_PLATFORMS.map((platform) => {
              const { connected, connectionIssue, detail } = getHelpdeskState(platform.id, status);
              return (
                <IntegrationCard
                  key={platform.id}
                  logo={platform.logo}
                  name={platform.name}
                  description={platform.description}
                  href={platform.href}
                  connected={connected}
                  connectionIssue={connectionIssue}
                  detail={detail}
                  available={platform.available}
                />
              );
            })}
          </div>
        </StepSection>
      </div>
    </>
  );
}
