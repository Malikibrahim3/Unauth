import { gradeHeadline } from '@/lib/gorgias/widgetData';
import type {
  GorgiasClaimWidgetResult,
  NetworkStats,
  PrimaryReason,
  ThisStoreOrdersSource,
} from '@/lib/gorgias/widgetData';

/**
 * Flat root object — field paths must match buildGorgiasSidebarWidgetTemplate() exactly.
 *
 * `identity` is the PRIMARY element (the confidence grade — who the person is).
 * The remaining fields are a plain, sourced claims record (what they have done).
 * No risk score, risk band, or "fraud" wording is emitted.
 */
export type GorgiasWidgetJsonPayload = {
  /** PRIMARY: identity confidence grade + what it matched on. */
  identity: string;
  /** Clean-state confirmation or a one-line factual claims summary. */
  claims: string;
  orders: string;
  claim_rate: string;
  primary_reason: string;
  recent_activity: string;
  /** CE 3.0 evidence indicator, or '—'. */
  ce3_evidence: string;
  watchlisted: string;
};

const NO_NETWORK_LABEL = 'No network history found';
const NO_CROSS_STORE_LABEL = 'No cross-store history found';
const NO_CLAIMS_LABEL = 'No prior claims on record';

function wholePct(rate0to1: number): string {
  return `${Math.round(rate0to1 * 100)}%`;
}

function pluralise(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
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

function formatStoreRecent(count: number): string {
  if (count === 0) return '—';
  return `${count} ${pluralise(count, 'claim', 'claims')} in last 90 days`;
}

/**
 * Build the `identity` line — the primary element. Grade comes first, then the
 * factual identifiers it matched on. This reflects identity certainty only and
 * is never conditioned on claim history.
 */
function formatIdentity(grade: string, matchedOn: string[]): string {
  if (grade === 'NO MATCH') return 'No identity match on record';
  const on = matchedOn.length > 0 ? ` — matched on ${matchedOn.join(', ')}` : '';
  return `${grade}${on}`;
}

export function claimWidgetToJson(result: GorgiasClaimWidgetResult): GorgiasWidgetJsonPayload {
  if (!result.ok) {
    if (result.kind === 'not_found') {
      return {
        identity: 'No identity match on record',
        claims: NO_CLAIMS_LABEL,
        orders: 'Not seen at any store yet',
        claim_rate: '—',
        primary_reason: '—',
        recent_activity: '—',
        ce3_evidence: '—',
        watchlisted: '—',
      };
    }
    if (result.kind === 'identity_unresolved') {
      return {
        identity: 'No identifier found — open the customer in Gorgias to check',
        claims: '—',
        orders: 'Customer identity not resolved',
        claim_rate: '—',
        primary_reason: '—',
        recent_activity: '—',
        ce3_evidence: '—',
        watchlisted: '—',
      };
    }
    if (result.kind === 'helpdesk_disconnected') {
      const message = result.message ?? 'Gorgias is not connected to Unauth.';
      return {
        identity: 'Helpdesk not connected',
        claims: 'Claim history unavailable',
        orders: message,
        claim_rate: 'Incomplete until Gorgias is reconnected',
        primary_reason: '—',
        recent_activity: 'Reconnect Gorgias in Unauth settings',
        ce3_evidence: '—',
        watchlisted: '—',
      };
    }
    return {
      identity: '—',
      claims: '—',
      orders: (result.message ?? 'Could not load identity intelligence.').slice(0, 100),
      claim_rate: '—',
      primary_reason: '—',
      recent_activity: '—',
      ce3_evidence: '—',
      watchlisted: '—',
    };
  }

  const {
    confidenceGrade,
    matchedOn,
    ce3EvidenceAvailable,
    thisStore,
    network,
    storeClaimValue,
    storePrimaryReason,
    storeRecentClaimCount,
  } = result.data;

  if (
    thisStore.ordersCountSource === 'none' &&
    thisStore.orderCount === 0 &&
    thisStore.claimCount === 0 &&
    !network
  ) {
    return {
      identity: formatIdentity(gradeHeadline(confidenceGrade), matchedOn),
      claims: 'Order data not synced to Unauth yet',
      orders: 'Order data not synced to Unauth yet',
      claim_rate: '—',
      primary_reason: '—',
      recent_activity: 'Connect Shopify or wait for the next order sync',
      ce3_evidence: '—',
      watchlisted: '—',
    };
  }

  const primaryReason = network
    ? formatPrimaryReasonValue(network.primaryReason)
    : formatPrimaryReasonValue(storePrimaryReason);

  const recentActivity = network
    ? formatRecent(network)
    : formatStoreRecent(storeRecentClaimCount);

  // Clean-state confirmation: no claims at this store and none across the network.
  const hasAnyClaims =
    thisStore.claimCount > 0 || (network ? network.claimCount > 0 : false);
  const claims = hasAnyClaims
    ? formatClaimsSummary(thisStore.claimCount, network, storeClaimValue, thisStore.lastClaimAt)
    : NO_CLAIMS_LABEL;

  return {
    identity: formatIdentity(gradeHeadline(confidenceGrade), matchedOn),
    claims,
    orders: formatClaimOrders(thisStore.orderCount, network, thisStore.ordersCountSource),
    claim_rate: formatClaimRateField(thisStore.claimRate, network),
    primary_reason: primaryReason,
    recent_activity: recentActivity,
    ce3_evidence: ce3EvidenceAvailable
      ? 'CE 3.0 evidence available — documented cross-merchant history'
      : '—',
    watchlisted: result.data.watchlisted ? '⚠ On watchlist' : 'Not on watchlist',
  };
}

function formatClaimDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * One-line factual claims summary: counts, amount, and date for the store's own
 * claims (own data) plus an anonymised network count. Amounts/dates are only
 * shown for own-store claims — never for the network line.
 */
function formatClaimsSummary(
  storeClaims: number,
  network: NetworkStats | null,
  storeClaimValue: number | null,
  storeLastClaimAt: string | null
): string {
  const parts: string[] = [];
  if (storeClaims > 0) {
    const storeBits = [`${storeClaims} ${pluralise(storeClaims, 'claim', 'claims')}`];
    if (storeClaimValue != null) storeBits.push(`$${storeClaimValue.toLocaleString()}`);
    const date = formatClaimDate(storeLastClaimAt);
    if (date) storeBits.push(`last ${date}`);
    parts.push(`${storeBits.join(' · ')} · your store`);
  }
  if (network && network.claimCount > 0) {
    parts.push(
      `${network.claimCount} ${pluralise(network.claimCount, 'claim', 'claims')} across ${network.merchantCount} ${pluralise(network.merchantCount, 'merchant', 'merchants')}`
    );
  }
  return parts.length > 0 ? parts.join(' · ') : NO_CLAIMS_LABEL;
}
