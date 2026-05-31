import type {
  GorgiasClaimWidgetResult,
  GorgiasWidgetModel,
  NetworkStats,
  PrimaryReason,
  ThisStoreOrdersSource,
  WidgetStats,
} from '@/lib/gorgias/widgetData';

/** Flat root object — field paths must match buildGorgiasSidebarWidgetTemplate() exactly. */
export type GorgiasWidgetJsonPayload = {
  orders: string;
  claim_rate: string;
  primary_reason: string;
  recent_activity: string;
};

const NO_NETWORK_LABEL = 'No network history found';
const NO_CROSS_STORE_LABEL = 'No cross-store history found';

function wholePct(rate0to1: number): string {
  return `${Math.round(rate0to1 * 100)}%`;
}

function formatPrimaryReasonValue(reason: PrimaryReason): string {
  if (!reason) return '—';
  if (reason.type === 'dominant') return `${reason.label} · ${reason.percentage}%`;
  return `${reason.reasonCount} different ${reason.reasonCount === 1 ? 'reason' : 'reasons'} used`;
}

function formatClaimOrders(
  thisStoreOrders: number,
  network: NetworkStats | null,
  source?: ThisStoreOrdersSource
): string {
  const isLinkedShopifyCount = source === 'shopify_identities';
  const storePart = isLinkedShopifyCount
    ? `${thisStoreOrders} ${pluralise(thisStoreOrders, 'linked order', 'linked orders')} here`
    : `${thisStoreOrders} ${pluralise(thisStoreOrders, 'order', 'orders')} here`;
  if (!network) return `${storePart} · ${isLinkedShopifyCount ? NO_CROSS_STORE_LABEL : NO_NETWORK_LABEL}`;
  const merchants = pluralise(network.merchantCount, 'merchant', 'merchants');
  if (network.orderCount > 0) {
    return `${storePart} · ${network.orderCount} across ${network.merchantCount} ${merchants}`;
  }
  // Network present but order denominator unknown (cross-merchant detect only).
  return `${storePart} · seen at ${network.merchantCount} ${merchants}`;
}

function formatClaimRateField(thisStoreRate: number, network: NetworkStats | null): string {
  const storePart = `${wholePct(thisStoreRate)} this store`;
  if (!network || network.orderCount === 0) return storePart;
  return `${storePart} · ${wholePct(network.claimRate)} network`;
}

function formatRecent(network: NetworkStats | null): string {
  if (!network || network.recentClaimCount === 0) return '—';
  return `${network.recentClaimCount} ${pluralise(network.recentClaimCount, 'claim', 'claims')} in last 90 days`;
}

/**
 * Map the claim-intelligence widget data to the four native text fields the
 * Gorgias card renders. Two-column (This Store · Network) semantics are encoded
 * inside each string — Gorgias sidebar widgets have no table primitive. No risk
 * score and no "fraud" wording is emitted.
 */
function formatStoreRecent(count: number): string {
  if (count === 0) return '—';
  return `${count} ${pluralise(count, 'claim', 'claims')} in last 90 days`;
}

export function claimWidgetToJson(result: GorgiasClaimWidgetResult): GorgiasWidgetJsonPayload {
  if (!result.ok) {
    if (result.kind === 'not_found') {
      return { orders: 'Not seen at any store yet', claim_rate: '—', primary_reason: '—', recent_activity: '—' };
    }
    if (result.kind === 'identity_unresolved') {
      return {
        orders: 'Customer identity not resolved',
        claim_rate: '—',
        primary_reason: '—',
        recent_activity: 'Check ticket customer in Gorgias',
      };
    }
    return {
      orders: (result.message ?? 'Could not load identity intelligence.').slice(0, 100),
      claim_rate: '—',
      primary_reason: '—',
      recent_activity: '—',
    };
  }

  const { thisStore, network, storePrimaryReason, storeRecentClaimCount } = result.data;

  if (
    thisStore.ordersCountSource === 'none' &&
    thisStore.orderCount === 0 &&
    thisStore.claimCount === 0 &&
    !network
  ) {
    return {
      orders: 'Order data not synced to Unauth yet',
      claim_rate: '—',
      primary_reason: '—',
      recent_activity: 'Connect Shopify or wait for the next order sync',
    };
  }

  const primaryReason = network
    ? formatPrimaryReasonValue(network.primaryReason)
    : formatPrimaryReasonValue(storePrimaryReason);

  const recentActivity = network
    ? formatRecent(network)
    : formatStoreRecent(storeRecentClaimCount);

  return {
    orders: formatClaimOrders(thisStore.orderCount, network, thisStore.ordersCountSource),
    claim_rate: formatClaimRateField(thisStore.claimRate, network),
    primary_reason: primaryReason,
    recent_activity: recentActivity,
  };
}

// ---------------------------------------------------------------------------
// Display formatters
// ---------------------------------------------------------------------------

function pluralise(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function formatOrders(s: WidgetStats): string {
  const storeStr = `${s.storeOrders} ${pluralise(s.storeOrders, 'order', 'orders')} here`;
  if (s.networkMerchants <= 1) return storeStr;
  const storeCount = pluralise(s.networkMerchants, 'store', 'stores');
  return `${storeStr} · ${s.networkOrders} across ${s.networkMerchants} ${storeCount}`;
}

function formatClaimRate(s: WidgetStats): string {
  const storeRate = s.storeOrders > 0
    ? Math.round((s.storeClaims / s.storeOrders) * 100)
    : 0;
  const storeStr = `${storeRate}% this store`;

  if (s.networkMerchants <= 1 || s.networkOrders === 0) return storeStr;
  const networkRate = Math.round((s.networkClaims / s.networkOrders) * 100);
  return `${storeStr} · ${networkRate}% network`;
}

function formatPrimaryReason(s: WidgetStats): string {
  if (s.storeClaims === 0) return '—';
  return s.primaryReason ?? '—';
}

function formatRecentActivity(s: WidgetStats): string {
  if (s.storeRecentClaims === 0) return '—';
  return `${s.storeRecentClaims} ${pluralise(s.storeRecentClaims, 'claim', 'claims')} in last 90 days`;
}

// ---------------------------------------------------------------------------
// Fallback rows used when no stats are available
// ---------------------------------------------------------------------------

function noDataPayload(overrides: Partial<GorgiasWidgetJsonPayload> = {}): GorgiasWidgetJsonPayload {
  return {
    orders: '—',
    claim_rate: '—',
    primary_reason: '—',
    recent_activity: '—',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

export function gorgiasWidgetModelToJson(model: GorgiasWidgetModel): GorgiasWidgetJsonPayload {
  if (model.state === 'error') {
    return noDataPayload({ orders: model.message.slice(0, 100) });
  }

  if (model.state === 'not_found') {
    return noDataPayload({ orders: 'Not seen at any store yet' });
  }

  if (model.state === 'merchant_profile') {
    const s = model.stats;
    if (!s) return noDataPayload();
    return {
      orders: formatOrders(s),
      claim_rate: formatClaimRate(s),
      primary_reason: formatPrimaryReason(s),
      recent_activity: formatRecentActivity(s),
    };
  }

  if (model.state === 'low_clear') {
    const p = model.merchantProfile;
    const storeRate = p.totalOrders > 0
      ? Math.round((p.totalRefunds / p.totalOrders) * 100)
      : 0;
    return noDataPayload({
      orders: `${p.totalOrders} ${pluralise(p.totalOrders, 'order', 'orders')} here`,
      claim_rate: `${storeRate}% this store`,
      recent_activity: '—',
    });
  }

  // 'risk' state — customer is in the network but not known at this store.
  const cm = model.lookup.cross_merchant;
  if (cm) {
    const networkStr = `${cm.claim_count} ${pluralise(cm.claim_count, 'claim', 'claims')} across ${cm.merchant_count} ${pluralise(cm.merchant_count, 'store', 'stores')}`;
    return noDataPayload({ orders: `No history here · ${networkStr}` });
  }
  return noDataPayload({ orders: 'No history at this store' });
}
