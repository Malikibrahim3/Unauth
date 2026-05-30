import type { GorgiasWidgetModel, WidgetStats } from '@/lib/gorgias/widgetData';

/** Flat root object — field paths must match buildGorgiasSidebarWidgetTemplate() exactly. */
export type GorgiasWidgetJsonPayload = {
  orders: string;
  claim_rate: string;
  primary_reason: string;
  recent_activity: string;
};

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
