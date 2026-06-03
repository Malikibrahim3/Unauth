import { CONTEXT_REVIEW_DISCLAIMER } from '@/lib/api/lookup/contextLookupCore';
import { gradeHeadline } from '@/lib/gorgias/widgetData';
import type {
  GorgiasClaimWidgetResult,
  NetworkStats,
  PrimaryReason,
  ThisStoreOrdersSource,
} from '@/lib/gorgias/widgetData';
import {
  CONTEXT_UNLOCK_CTA_LABELS,
} from '@/lib/billing/contextCredits';
import type { CreditUsageWidgetFields } from '@/lib/billing/creditUsage';
import { env } from '@/lib/utils/env';
import { buildGorgiasWidgetUnlockUrlSet } from '@/lib/gorgias/widgetUnlockUrls';

/**
 * Flat root object — field paths must match buildGorgiasSidebarWidgetTemplate() exactly.
 *
 * Field paths must match `buildGorgiasSidebarWidgetTemplate()`. Pre-unlock payloads are
 * credit-gated copy + unlock CTAs unless `allowDetailedPreview` is set in non-production.
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
  cta_label: string;
  cta_url: string;
  /** Browser-openable GET unlock links (Gorgias custom.links). */
  basic_unlock_url: string;
  full_unlock_url: string;
  evidence_unlock_url: string;
  basic_unlock_label: string;
  full_unlock_label: string;
  evidence_unlock_label: string;
  /** Set when monthly usage is high or exhausted (80%+ / cap). */
  credit_usage_banner?: string;
  credit_topup_label?: string;
  credit_topup_url?: string;
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
   * Dev-only (`NODE_ENV !== 'production'`): emit pre-unlock case stats in widget JSON/HTML.
   * Requires `?widget_diagnostic=1` on the widget route.
   */
  allowDetailedPreview?: boolean;
  creditUsage?: CreditUsageWidgetFields | null;
};

/** True unless an explicit non-production diagnostic preview was requested. */
export function useCreditGatedWidgetPreview(options?: GorgiasWidgetJsonOptions): boolean {
  return !(options?.allowDetailedPreview === true && process.env.NODE_ENV !== 'production');
}

const UNLOCK_LABELS = {
  basic_unlock_label: CONTEXT_UNLOCK_CTA_LABELS.basic_context,
  full_unlock_label: CONTEXT_UNLOCK_CTA_LABELS.full_context,
  evidence_unlock_label: CONTEXT_UNLOCK_CTA_LABELS.evidence_summary,
} as const;

const DATA_SAFETY_NOTE =
  'Other merchants’ raw customer data is not exposed. Pseudonymous network context is available via credit unlock.';

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
>;

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
  options?: GorgiasWidgetJsonOptions,
): GorgiasWidgetJsonPayload {
  const credit = options?.creditUsage;
  return {
    ...payload,
    ...UNLOCK_LABELS,
    ...unlockUrls(link),
    ...(credit
      ? {
          credit_usage_banner: credit.credit_usage_banner,
          credit_topup_label: credit.credit_topup_label,
          credit_topup_url: credit.credit_topup_url,
        }
      : {}),
  };
}

/** Case-scoped Gorgias tickets get credit unlock links; preview must not leak stats before unlock. */
export function hasGorgiasUnlockCaseScope(link?: GorgiasWidgetLinkContext): boolean {
  if (!link?.widgetToken?.trim() || !link.email.trim()) return false;
  return Boolean(link.ticketRef?.trim() || link.orderRef?.trim() || link.claimId?.trim());
}

function buildCreditGatedPreviewPayload(profileUrl?: string | null): WidgetCorePayload {
  return {
    identity: 'Context available for this ticket',
    claims: CONTEXT_UNLOCK_CTA_LABELS.basic_context,
    orders: CONTEXT_UNLOCK_CTA_LABELS.full_context,
    claim_rate: CONTEXT_UNLOCK_CTA_LABELS.evidence_summary,
    primary_reason: "Uses your store's own order, claim, delivery, and customer history.",
    recent_activity:
      'A full check adds pseudonymous network context from participating merchants.',
    ce3_evidence: CONTEXT_REVIEW_DISCLAIMER,
    watchlisted: DATA_SAFETY_NOTE,
    ...baseCta(profileUrl),
  };
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

function formatStoreRecent(count: number): string {
  if (count === 0) return '—';
  return `${count} ${pluralise(count, 'claim', 'claims')} in last 90 days`;
}

function formatIdentity(grade: string, matchedOn: string[]): string {
  if (grade === 'NO MATCH') return 'No identity match on record';
  const on = matchedOn.length > 0 ? ` — matched on ${matchedOn.join(', ')}` : '';
  return `${grade}${on}`;
}

function appUrl(path: string): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}${path}`;
}

function baseCta(profileUrl?: string | null): Pick<GorgiasWidgetJsonPayload, 'cta_label' | 'cta_url'> {
  return {
    cta_label: 'Open case in Unauth →',
    cta_url: profileUrl?.trim() || appUrl('/customers'),
  };
}

function connectCta(): Pick<GorgiasWidgetJsonPayload, 'cta_label' | 'cta_url'> {
  return {
    cta_label: 'Connect to Unauth →',
    cta_url: appUrl('/settings/integrations'),
  };
}

export function claimWidgetToJson(
  result: GorgiasClaimWidgetResult,
  link?: GorgiasWidgetLinkContext,
  options?: GorgiasWidgetJsonOptions,
): GorgiasWidgetJsonPayload {
  const creditGatedPreview = useCreditGatedWidgetPreview(options);

  if (!result.ok) {
    if (result.kind === 'not_found') {
      if (creditGatedPreview) {
        return withUnlockFields(buildCreditGatedPreviewPayload(), link, options);
      }
      return withUnlockFields(
        {
          identity: 'No identity match on record',
          claims: NO_CLAIMS_LABEL,
          orders: 'Not seen at any store yet',
          claim_rate: '—',
          primary_reason: '—',
          recent_activity: '—',
          ce3_evidence: '—',
          watchlisted: DATA_SAFETY_NOTE,
          ...baseCta(),
        },
        link,
        options,
      );
    }
    if (result.kind === 'identity_unresolved') {
      if (creditGatedPreview) {
        return withUnlockFields(
          {
            identity: 'Context available for this ticket',
            claims: CONTEXT_UNLOCK_CTA_LABELS.basic_context,
            orders: CONTEXT_UNLOCK_CTA_LABELS.full_context,
            claim_rate: CONTEXT_UNLOCK_CTA_LABELS.evidence_summary,
            primary_reason: 'Open the customer profile in Gorgias so Unauth can resolve the ticket email.',
            recent_activity:
              'A full check adds pseudonymous network context from participating merchants.',
            ce3_evidence: CONTEXT_REVIEW_DISCLAIMER,
            watchlisted: DATA_SAFETY_NOTE,
            ...baseCta(),
          },
          link,
        );
      }
      return withUnlockFields(
        {
          identity: 'No identifier found — open the customer in Gorgias to check',
          claims: '—',
          orders: 'Customer identity not resolved',
          claim_rate: '—',
          primary_reason: '—',
          recent_activity: '—',
          ce3_evidence: '—',
          watchlisted: DATA_SAFETY_NOTE,
          ...baseCta(),
        },
        link,
        options,
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
          watchlisted: DATA_SAFETY_NOTE,
          ...connectCta(),
        },
        link,
        options,
      );
    }
    if (creditGatedPreview) {
      return withUnlockFields(buildCreditGatedPreviewPayload(), link, options);
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
        watchlisted: DATA_SAFETY_NOTE,
        ...baseCta(),
      },
      link,
    );
  }

  if (creditGatedPreview) {
    const profileUrl = result.data.profileUrl;
    if (
      result.data.thisStore.ordersCountSource === 'none' &&
      result.data.thisStore.orderCount === 0 &&
      result.data.thisStore.claimCount === 0 &&
      !result.data.network
    ) {
      return withUnlockFields(
        {
          ...buildCreditGatedPreviewPayload(profileUrl),
          primary_reason: 'Connect Shopify or wait for the next order sync to load store history.',
        },
        link,
        options,
      );
    }
    return withUnlockFields(buildCreditGatedPreviewPayload(profileUrl), link, options);
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
    return withUnlockFields(
      {
        identity: formatIdentity(gradeHeadline(confidenceGrade), matchedOn),
        claims: 'Order data not synced to Unauth yet',
        orders: 'Order data not synced to Unauth yet',
        claim_rate: '—',
        primary_reason: '—',
        recent_activity: 'Connect Shopify or wait for the next order sync',
        ce3_evidence: '—',
        watchlisted: DATA_SAFETY_NOTE,
        ...baseCta(result.data.profileUrl),
      },
      link,
    );
  }

  const primaryReason = network
    ? formatPrimaryReasonValue(network.primaryReason)
    : formatPrimaryReasonValue(storePrimaryReason);

  const recentActivity = network
    ? formatRecent(network)
    : formatStoreRecent(storeRecentClaimCount);

  const hasAnyClaims =
    thisStore.claimCount > 0 || (network ? network.claimCount > 0 : false);
  const claims = hasAnyClaims
    ? formatClaimsSummary(thisStore.claimCount, network, storeClaimValue, thisStore.lastClaimAt)
    : NO_CLAIMS_LABEL;

  return withUnlockFields(
    {
      identity: formatIdentity(gradeHeadline(confidenceGrade), matchedOn),
      claims,
      orders: formatClaimOrders(thisStore.orderCount, network, thisStore.ordersCountSource),
      claim_rate: formatClaimRateField(thisStore.claimRate, network),
      primary_reason: primaryReason,
      recent_activity: recentActivity,
      ce3_evidence: ce3EvidenceAvailable
        ? 'CE 3.0 evidence available — documented cross-merchant history'
        : '—',
      watchlisted: DATA_SAFETY_NOTE,
      ...baseCta(result.data.profileUrl),
    },
    link,
    options,
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
