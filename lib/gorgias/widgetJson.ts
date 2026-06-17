import { gradeHeadline } from '@/lib/gorgias/widgetData';
import type {
  GorgiasClaimWidgetResult,
  NetworkStats,
  PrimaryReason,
  ThisStoreOrdersSource,
} from '@/lib/gorgias/widgetData';
import { env } from '@/lib/utils/env';
import { buildGorgiasWidgetUnlockUrlSet } from '@/lib/gorgias/widgetUnlockUrls';
import { GORGIAS_SETTINGS_INTEGRATIONS_PATH } from '@/lib/support/gorgias/supportConnectionShared';
import { computeWidgetTrustSummary } from '@/lib/gorgias/widgetTrustSignals';

/**
 * Flat root object — field paths must match buildGorgiasSidebarWidgetTemplate() exactly.
 *
 * All fields are factual context only. No risk scores, no outcome recommendations,
 * no credit-amount language in user-facing copy.
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
  /**
   * @deprecated Legacy Gorgias template field path `watchlisted`. Always data-safety copy,
   * never merchant watchlist state. Do not use for new product logic.
   */
  watchlisted: string;
  /** Order reference detected from the current Gorgias ticket, or '—' when unavailable. */
  order_context: string;
  /** Neutral, factual summary of available claim context for this ticket. No outcome recommendations. */
  context_summary: string;
  /**
   * Output of the MERCHANT'S OWN configured rules applied to Unauth's signals.
   * Never Unauth's own judgment. '—' when no rule matched or no rules configured.
   */
  recommendation: string;
  /** Which rule fired + matched conditions, or a neutral prompt/state. */
  recommendation_detail: string;
  cta_label: string;
  cta_url: string;
  /** Browser-openable GET unlock links (Gorgias custom.links). */
  basic_unlock_url: string;
  full_unlock_url: string;
  evidence_unlock_url: string;
  basic_unlock_label: string;
  full_unlock_label: string;
  evidence_unlock_label: string;
};

export type GorgiasWidgetLinkContext = {
  widgetToken: string;
  email: string;
  ticketRef: string | null;
  orderRef: string | null;
  claimId?: string | null;
};

export type GorgiasWidgetJsonOptions = {
  /**
   * Dev-only (`NODE_ENV !== 'production'`): emit pre-unlock case stats in widget HTML preview.
   * Requires `?widget_diagnostic=1` on the widget route. No longer affects JSON output.
   */
  allowDetailedPreview?: boolean;
  /** Show cross-merchant network intelligence (Growth+ tier). Own-store data is always shown. */
  showNetworkIntelligence?: boolean;
};

/** True unless an explicit non-production diagnostic preview was requested. */
export function useCreditGatedWidgetPreview(options?: GorgiasWidgetJsonOptions): boolean {
  return !(options?.allowDetailedPreview === true && process.env.NODE_ENV !== 'production');
}

const UNLOCK_LABELS = {
  basic_unlock_label: 'View full context →',
  full_unlock_label: 'View network context →',
  evidence_unlock_label: 'View claim summary →',
} as const;

const NO_NETWORK_LABEL = 'No network history found';
const NO_CROSS_STORE_LABEL = 'No cross-store history found';
const NO_CLAIMS_LABEL = 'No prior claims on record';

type WidgetCorePayload = Omit<
  GorgiasWidgetJsonPayload,
  | 'basic_unlock_url'
  | 'full_unlock_url'
  | 'evidence_unlock_url'
  | 'basic_unlock_label'
  | 'full_unlock_label'
  | 'evidence_unlock_label'
  | 'recommendation'
  | 'recommendation_detail'
>;

/**
 * Recommendation fields default to neutral here. The widget route overrides
 * them with the merchant's own rule evaluation when one is available — the
 * recommendation is never Unauth's own judgment.
 */
const RECOMMENDATION_DEFAULTS = {
  recommendation: '—',
  recommendation_detail: 'Set up fraud rules to get recommendations',
} as const;

// ---------------------------------------------------------------------------
// Context helpers — order reference and neutral summary
// ---------------------------------------------------------------------------

function buildOrderContext(link?: GorgiasWidgetLinkContext): string {
  const ref = link?.orderRef?.trim();
  if (!ref) return 'No order reference detected in this ticket';
  return `Ticket linked to order ${ref}`;
}

function pluralWord(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function buildContextSummary(
  result: GorgiasClaimWidgetResult,
  link: GorgiasWidgetLinkContext | undefined,
  showNetworkIntelligence: boolean,
): string {
  const orderRef = link?.orderRef?.trim() ?? null;

  if (!result.ok) {
    switch (result.kind) {
      case 'not_found':
        return orderRef
          ? `Order ${orderRef} · no prior claim history at your store`
          : 'No prior claim history at your store';
      case 'identity_unresolved':
        return 'Customer identity not resolved — no context available for this ticket';
      case 'helpdesk_disconnected':
        return 'Helpdesk not connected — reconnect Gorgias in Unauth settings';
      default:
        return 'Context unavailable for this ticket';
    }
  }

  const { thisStore, network, ce3EvidenceAvailable, storeRecentClaimCount } = result.data;
  const parts: string[] = [];

  if (orderRef) parts.push(`Order ${orderRef}`);

  if (thisStore.orderCount > 0) {
    parts.push(`${thisStore.orderCount} ${pluralWord(thisStore.orderCount, 'order', 'orders')} at your store`);
  } else {
    parts.push('No prior orders at your store');
  }

  if (thisStore.claimCount > 0) {
    parts.push(`${thisStore.claimCount} prior ${pluralWord(thisStore.claimCount, 'claim', 'claims')}`);
    if (storeRecentClaimCount > 0) {
      parts.push(`${storeRecentClaimCount} in last 90 days`);
    }
  } else if (thisStore.orderCount > 0) {
    parts.push('no prior claims');
  }

  if (ce3EvidenceAvailable) parts.push('claim evidence available');

  if (showNetworkIntelligence && network && network.merchantCount > 0) {
    parts.push(`network signal: seen at ${network.merchantCount} ${pluralWord(network.merchantCount, 'merchant', 'merchants')}`);
  } else if (!showNetworkIntelligence && network && network.merchantCount > 0) {
    parts.push('network intelligence available on Growth');
  }

  return parts.join(' · ') || 'Store context available — open in Unauth for details';
}

function unlockUrls(link: GorgiasWidgetLinkContext | undefined): Pick<
  GorgiasWidgetJsonPayload,
  'basic_unlock_url' | 'full_unlock_url' | 'evidence_unlock_url'
> {
  if (!link?.widgetToken || !link.email.trim()) {
    return { basic_unlock_url: '', full_unlock_url: '', evidence_unlock_url: '' };
  }
  if (!link.ticketRef?.trim() && !link.orderRef?.trim() && !link.claimId?.trim()) {
    return { basic_unlock_url: '', full_unlock_url: '', evidence_unlock_url: '' };
  }
  return buildGorgiasWidgetUnlockUrlSet({
    appBaseUrl: env.NEXT_PUBLIC_APP_URL,
    widgetToken: link.widgetToken,
    email: link.email,
    ticketRef: link.ticketRef,
    orderRef: link.orderRef,
    claimId: link.claimId ?? null,
  });
}

function withUnlockFields(
  payload: WidgetCorePayload,
  link?: GorgiasWidgetLinkContext,
): GorgiasWidgetJsonPayload {
  return {
    ...RECOMMENDATION_DEFAULTS,
    ...payload,
    ...UNLOCK_LABELS,
    ...unlockUrls(link),
  };
}

// ---------------------------------------------------------------------------
// Recommendation — output of the merchant's own rules (never Unauth's judgment)
// ---------------------------------------------------------------------------

const RECOMMENDATION_LABELS: Record<string, string> = {
  approve: 'Approve',
  manual_review: 'Manual review',
  deny: 'Deny',
};

/**
 * Formats a rules-engine result into the two native widget fields.
 *
 * @param ruleCount number of active rules the merchant has configured. Used to
 *        distinguish "no rules configured" from "rules exist, none matched".
 */
export function formatRecommendationFields(
  result: { recommendation: string; rule_name: string | null; justification_lines: string[] },
  ruleCount: number,
): Pick<GorgiasWidgetJsonPayload, 'recommendation' | 'recommendation_detail'> {
  if (result.recommendation === 'no_match') {
    if (ruleCount === 0) {
      return {
        recommendation: 'No rules configured',
        recommendation_detail: 'Set up fraud rules in Unauth to get recommendations',
      };
    }
    return {
      recommendation: 'No rule matched',
      recommendation_detail: 'None of your configured rules matched this identity',
    };
  }

  const label = RECOMMENDATION_LABELS[result.recommendation] ?? result.recommendation;
  const heading = result.rule_name ? `${label} · ${result.rule_name}` : label;
  // justification_lines[0] is the "Rule … triggered" line; the rest are the
  // matched conditions. Join with " · " for the single-line native text widget.
  const justification = result.justification_lines.length > 0
    ? result.justification_lines.join(' · ')
    : null;
  const detail = justification
    ? `${justification} · Based on your configured rules`
    : 'Based on your configured rules';
  return { recommendation: heading, recommendation_detail: detail };
}

/** Case-scoped Gorgias tickets get credit unlock links; preview must not leak stats before unlock. */
export function hasGorgiasUnlockCaseScope(link?: GorgiasWidgetLinkContext): boolean {
  if (!link?.widgetToken?.trim() || !link.email.trim()) return false;
  return Boolean(link.ticketRef?.trim() || link.orderRef?.trim() || link.claimId?.trim());
}


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

function formatStoreRecent(count: number, primaryReason?: PrimaryReason): string {
  if (count === 0) return '—';
  const base = `${count} ${pluralise(count, 'claim', 'claims')} in last 90 days`;
  if (count === 1 && primaryReason?.type === 'dominant') {
    return `${base} · ${primaryReason.label}`;
  }
  return base;
}

function formatIdentity(grade: string, matchedOn: string[]): string {
  if (grade === 'NO MATCH') return 'No identity match on record';
  const on = matchedOn.length > 0 ? ` — matched on ${matchedOn.join(', ')}` : '';
  return `${grade}${on}`;
}

function appUrl(path: string): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}${path}`;
}

function baseCta(
  profileUrl?: string | null,
  link?: GorgiasWidgetLinkContext,
): Pick<GorgiasWidgetJsonPayload, 'cta_label' | 'cta_url'> {
  const base = profileUrl?.trim() || appUrl('/customers');
  if (!link) {
    return { cta_label: 'Open in Unauth →', cta_url: base };
  }
  const extras = ['source=gorgias'];
  if (link.ticketRef?.trim()) {
    extras.push(`ticket_id=${encodeURIComponent(link.ticketRef.trim())}`);
  }
  const sep = base.includes('?') ? '&' : '?';
  return {
    cta_label: 'Open in Unauth →',
    cta_url: `${base}${sep}${extras.join('&')}`,
  };
}

function buildNetworkEvidenceField(
  ce3EvidenceAvailable: boolean,
  network: NetworkStats | null,
  showNetworkIntelligence: boolean,
): string {
  if (showNetworkIntelligence) {
    if (ce3EvidenceAvailable) return 'CE 3.0 evidence available — documented cross-merchant history';
    if (network && network.merchantCount > 0) {
      const merchants = network.merchantCount === 1 ? 'merchant' : 'merchants';
      return `Seen at ${network.merchantCount} ${merchants} · no CE 3.0 evidence`;
    }
    return NO_CROSS_STORE_LABEL;
  }
  if (network && network.merchantCount > 0) return 'Network signal available — upgrade to see details';
  if (ce3EvidenceAvailable) return 'Cross-merchant evidence available — upgrade to access';
  return '—';
}

function connectCta(): Pick<GorgiasWidgetJsonPayload, 'cta_label' | 'cta_url'> {
  return {
    cta_label: 'Connect to Unauth →',
    cta_url: appUrl(GORGIAS_SETTINGS_INTEGRATIONS_PATH),
  };
}

export function claimWidgetToJson(
  result: GorgiasClaimWidgetResult,
  link?: GorgiasWidgetLinkContext,
  options?: GorgiasWidgetJsonOptions,
): GorgiasWidgetJsonPayload {
  const showNetworkIntelligence = options?.showNetworkIntelligence ?? false;

  if (!result.ok) {
    if (result.kind === 'not_found') {
      return withUnlockFields(
        {
          identity: 'No prior record at your store',
          claims: NO_CLAIMS_LABEL,
          orders: 'No orders synced yet',
          claim_rate: '—',
          primary_reason: '—',
          recent_activity: '—',
          ce3_evidence: '—',
          watchlisted: 'Standard handling · no prior history found',
          order_context: buildOrderContext(link),
          context_summary: buildContextSummary(result, link, showNetworkIntelligence),
          ...baseCta(null, link),
        },
        link,
      );
    }
    if (result.kind === 'identity_unresolved') {
      return withUnlockFields(
        {
          identity: 'No identifier found — open the customer in Gorgias to check',
          claims: '—',
          orders: '—',
          claim_rate: '—',
          primary_reason: '—',
          recent_activity: '—',
          ce3_evidence: '—',
          watchlisted: '—',
          order_context: buildOrderContext(link),
          context_summary: buildContextSummary(result, link, showNetworkIntelligence),
          ...baseCta(null, link),
        },
        link,
      );
    }
    if (result.kind === 'helpdesk_disconnected') {
      return withUnlockFields(
        {
          identity: 'Helpdesk not connected',
          claims: 'Reconnect Gorgias',
          orders: 'Not connected',
          claim_rate: 'Unavailable',
          primary_reason: '—',
          recent_activity: 'Reconnect in Unauth',
          ce3_evidence: '—',
          watchlisted: '—',
          order_context: buildOrderContext(link),
          context_summary: buildContextSummary(result, link, showNetworkIntelligence),
          ...connectCta(),
        },
        link,
      );
    }
    return withUnlockFields(
      {
        identity: '—',
        claims: '—',
        orders: (result.message ?? 'Could not load context preview.').slice(0, 100),
        claim_rate: '—',
        primary_reason: '—',
        recent_activity: '—',
        ce3_evidence: '—',
        watchlisted: '—',
        order_context: buildOrderContext(link),
        context_summary: buildContextSummary(result, link, showNetworkIntelligence),
        ...baseCta(null, link),
      },
      link,
    );
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

  const networkData = showNetworkIntelligence ? network : null;

  if (
    thisStore.ordersCountSource === 'none' &&
    thisStore.orderCount === 0 &&
    thisStore.claimCount === 0 &&
    !network
  ) {
    return withUnlockFields(
      {
        identity: formatIdentity(gradeHeadline(confidenceGrade), matchedOn),
        claims: 'No order history synced yet',
        orders: 'Connect Shopify or wait for the next sync',
        claim_rate: '—',
        primary_reason: '—',
        recent_activity: '—',
        ce3_evidence: '—',
        watchlisted: computeWidgetTrustSummary({
          orderCount: 0,
          claimCount: 0,
          claimRate: 0,
          recentClaimCount: 0,
          confidenceGrade: gradeHeadline(confidenceGrade),
          networkSignalAvailable: false,
          ce3EvidenceAvailable,
          lastClaimAt: null,
        }),
        order_context: buildOrderContext(link),
        context_summary: buildContextSummary(result, link, showNetworkIntelligence),
        ...baseCta(result.data.profileUrl, link),
      },
      link,
    );
  }

  const hasAnyClaims =
    thisStore.claimCount > 0 || (networkData ? networkData.claimCount > 0 : false);
  const claims = hasAnyClaims
    ? formatClaimsSummary(thisStore.claimCount, networkData, storeClaimValue, thisStore.lastClaimAt)
    : NO_CLAIMS_LABEL;

  const primaryReason = networkData
    ? formatPrimaryReasonValue(networkData.primaryReason)
    : formatPrimaryReasonValue(storePrimaryReason);

  const recentActivity = networkData
    ? formatRecent(networkData)
    : formatStoreRecent(storeRecentClaimCount, storePrimaryReason);

  return withUnlockFields(
    {
      identity: formatIdentity(gradeHeadline(confidenceGrade), matchedOn),
      claims,
      orders: formatClaimOrders(thisStore.orderCount, networkData, thisStore.ordersCountSource),
      claim_rate: formatClaimRateField(thisStore.claimRate, networkData),
      primary_reason: primaryReason,
      recent_activity: recentActivity,
      ce3_evidence: buildNetworkEvidenceField(ce3EvidenceAvailable, network, showNetworkIntelligence),
      watchlisted: computeWidgetTrustSummary({
        orderCount: thisStore.orderCount,
        claimCount: thisStore.claimCount,
        claimRate: thisStore.claimRate,
        recentClaimCount: storeRecentClaimCount,
        confidenceGrade: gradeHeadline(confidenceGrade),
        networkSignalAvailable: network !== null,
        ce3EvidenceAvailable,
        lastClaimAt: thisStore.lastClaimAt,
      }),
      order_context: buildOrderContext(link),
      context_summary: buildContextSummary(result, link, showNetworkIntelligence),
      ...baseCta(result.data.profileUrl, link),
    },
    link,
  );
}

function formatClaimDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

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

// Backward-compatible export name used by tests and older callers.
export const gorgiasWidgetModelToJson = claimWidgetToJson;
