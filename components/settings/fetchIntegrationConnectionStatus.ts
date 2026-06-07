import type { IntegrationsSetupStatus } from '@/components/settings/apiIntegrationsTypes';

export async function fetchIntegrationConnectionStatus(): Promise<IntegrationsSetupStatus> {
  const [gRes, sRes, zRes, fRes, wooRes, bcRes] = await Promise.all([
    fetch('/api/settings/gorgias/support-connection', { cache: 'no-store' }),
    fetch('/api/shopify/status', { cache: 'no-store' }),
    fetch('/api/settings/zendesk/connection', { cache: 'no-store' }),
    fetch('/api/settings/freshdesk/support-connection', { cache: 'no-store' }),
    fetch('/api/woocommerce/status', { cache: 'no-store' }),
    fetch('/api/bigcommerce/status', { cache: 'no-store' }),
  ]);

  const gBody = gRes.ok ? await gRes.json() : null;
  const sBody = sRes.ok ? await sRes.json() : null;
  const zBody = zRes.ok ? await zRes.json() : null;
  const zLink = zBody?.link as
    | {
        state?: 'connected' | 'degraded' | 'disconnected';
        helpdeskLinked?: boolean;
        sidebarReady?: boolean;
      }
    | undefined;
  const fBody = fRes.ok ? await fRes.json() : null;
  const wooBody = wooRes.ok ? await wooRes.json() : null;
  const bcBody = bcRes.ok ? await bcRes.json() : null;

  const gConn = gBody?.connection ?? null;
  const gLink = gBody?.link as
    | {
        state?: 'connected' | 'degraded' | 'disconnected';
        helpdeskLinked?: boolean;
        widgetReady?: boolean;
      }
    | undefined;
  const fConn = fBody?.connection ?? null;
  const gorgiasConnected = gLink?.helpdeskLinked ?? Boolean(gConn && gConn.status === 'active');

  return {
    gorgias: {
      connected: gorgiasConnected,
      widgetReady: gLink?.widgetReady ?? Boolean(gConn?.sidebar_widget_registered),
      linkState: gLink?.state ?? (gorgiasConnected ? 'connected' : 'disconnected'),
      detail: gConn?.provider_account_name ?? gConn?.provider_account_id ?? null,
    },
    shopify: {
      connected: Boolean(sBody?.connected),
      detail: sBody?.shopDomain ?? null,
    },
    zendesk: {
      connected: zLink?.helpdeskLinked ?? Boolean(zBody?.connected),
      sidebarReady: zLink?.sidebarReady ?? Boolean(zBody?.connection?.status === 'active'),
      linkState: zLink?.state ?? (zBody?.connected ? 'connected' : 'disconnected'),
      detail: zBody?.connection?.provider_account_id ?? null,
    },
    freshdesk: {
      connected: Boolean(fConn && fConn.status === 'active'),
      detail: fConn?.provider_account_name ?? fConn?.provider_account_id ?? null,
    },
    woocommerce: {
      connected: Boolean(wooBody?.connected),
      detail: wooBody?.storeKey ?? null,
    },
    bigcommerce: {
      connected: Boolean(bcBody?.connected),
      detail: bcBody?.storeKey ?? null,
    },
  };
}
