'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Zap } from 'lucide-react';
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
    description: 'Show claim intelligence inside your Gorgias ticket sidebar',
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
): { connected: boolean; detail: string | null } {
  if (id === 'shopify') return { connected: status.shopify.connected, detail: status.shopify.detail };
  if (id === 'woocommerce') return { connected: status.woocommerce.connected, detail: status.woocommerce.detail };
  if (id === 'bigcommerce') return { connected: status.bigcommerce.connected, detail: status.bigcommerce.detail };
  return { connected: false, detail: null };
}

function getHelpdeskState(
  id: HelpdeskPlatformId,
  status: IntegrationsSetupStatus,
): { connected: boolean; detail: string | null } {
  if (id === 'gorgias') return { connected: status.gorgias.connected, detail: status.gorgias.detail };
  if (id === 'freshdesk') return { connected: status.freshdesk.connected, detail: status.freshdesk.detail };
  if (id === 'zendesk') return { connected: status.zendesk.connected, detail: status.zendesk.detail };
  return { connected: false, detail: null };
}

function IntegrationCard({
  logo,
  name,
  description,
  href,
  connected,
  detail,
  available,
}: {
  logo: string;
  name: string;
  description: string;
  href: string;
  connected: boolean;
  detail: string | null;
  available: boolean;
}) {
  return (
    <div
      className="flex flex-col rounded-xl border p-4"
      style={{
        borderColor: connected
          ? 'color-mix(in srgb, var(--success) 35%, var(--border))'
          : 'var(--border)',
        background: connected
          ? 'color-mix(in srgb, var(--success) 3%, var(--surface))'
          : 'var(--surface)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <Image src={logo} alt="" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
        {connected ? (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            style={{
              background: 'color-mix(in srgb, var(--success) 12%, transparent)',
              color: 'var(--success)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Connected
          </span>
        ) : !available ? (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide"
            style={{
              background: 'color-mix(in srgb, var(--text-secondary) 10%, transparent)',
              color: 'var(--text-secondary)',
            }}
          >
            Soon
          </span>
        ) : null}
      </div>

      <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
        {name}
      </p>
      {connected && detail ? (
        <p className="text-xs mb-2 truncate" style={{ color: 'var(--text-secondary)' }}>
          {detail}
        </p>
      ) : null}
      <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>

      <div className="mt-4">
        {available ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              borderColor: 'var(--border)',
              color: connected ? 'var(--text-secondary)' : 'var(--text)',
              background: 'transparent',
            }}
          >
            {connected ? 'Manage' : <><span>Connect</span><ArrowRight className="h-3 w-3" /></>}
          </Link>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Coming soon
          </span>
        )}
      </div>
    </div>
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
      {/* Left: step indicator + connector line */}
      <div className="flex flex-col items-center">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{
            background: complete ? 'var(--success)' : 'var(--surface)',
            color: complete ? 'white' : 'var(--text-secondary)',
            border: complete
              ? 'none'
              : '1.5px solid var(--border)',
          }}
        >
          {complete ? <CheckCircle2 className="h-4 w-4" /> : <span>{number}</span>}
        </div>
        <div
          className="mt-2 w-px flex-1 min-h-4"
          style={{ background: 'var(--border)' }}
        />
      </div>

      {/* Right: content */}
      <div className="flex-1 pb-8 min-w-0">
        <div className="mb-4 mt-0.5">
          <p
            className="text-sm font-semibold"
            style={{ color: complete ? 'var(--text)' : 'var(--text)' }}
          >
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

function LiveBanner({
  storeName,
  helpdeskName,
}: {
  storeName: string;
  helpdeskName: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3 mb-8"
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
    </div>
  );
}

export default function IntegrationsSetupClient() {
  const { data: status } = useAsyncResource('integrations-setup-status', fetchIntegrationConnectionStatus);

  if (!status) {
    return (
      <div className="space-y-6">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-5">
            <div
              className="h-8 w-8 shrink-0 rounded-full animate-pulse"
              style={{ background: 'var(--border)' }}
            />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-32 rounded animate-pulse" style={{ background: 'var(--border)' }} />
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              >
                {[0, 1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="h-36 rounded-xl animate-pulse"
                    style={{ background: 'var(--border)' }}
                  />
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
            const { connected, detail } = getCommerceState(platform.id, status);
            return (
              <IntegrationCard
                key={platform.id}
                logo={platform.logo}
                name={platform.name}
                description={platform.description}
                href={platform.href}
                connected={connected}
                detail={detail}
                available={platform.available}
              />
            );
          })}
        </div>
      </StepSection>

      <StepSection
        number={2}
        title="Connect your helpdesk"
        subtitle="Surface claim intelligence — order history, trust indicators and prior claims — inside support tickets."
        complete={helpdeskConnected}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {HELPDESK_PLATFORMS.map((platform) => {
            const { connected, detail } = getHelpdeskState(platform.id, status);
            return (
              <IntegrationCard
                key={platform.id}
                logo={platform.logo}
                name={platform.name}
                description={platform.description}
                href={platform.href}
                connected={connected}
                detail={detail}
                available={platform.available}
              />
            );
          })}
        </div>
      </StepSection>
    </div>
  );
}
