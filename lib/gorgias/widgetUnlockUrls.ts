import type { ContextUnlockType } from '@/lib/billing/contextCredits';

export type GorgiasWidgetUnlockUrlParams = {
  appBaseUrl: string;
  widgetToken: string;
  contextType: ContextUnlockType;
  email: string;
  ticketRef?: string | null;
  orderRef?: string | null;
  claimId?: string | null;
};

/**
 * Signed browser-openable unlock URL for Gorgias sidebar links (GET).
 * Gorgias HTTP widgets cannot POST; agents open these links in a new tab.
 */
export function buildGorgiasWidgetUnlockActionUrl(params: GorgiasWidgetUnlockUrlParams): string {
  const base = params.appBaseUrl.replace(/\/$/, '');
  const q = new URLSearchParams();
  q.set('contextType', params.contextType);
  q.set('widget_token', params.widgetToken);
  if (params.email.trim()) q.set('email', params.email.trim());
  if (params.ticketRef?.trim()) q.set('ticketRef', params.ticketRef.trim());
  if (params.orderRef?.trim()) q.set('orderRef', params.orderRef.trim());
  if (params.claimId?.trim()) q.set('claimId', params.claimId.trim());
  return `${base}/api/gorgias/widget/unlock/action?${q.toString()}`;
}

export function buildGorgiasWidgetUnlockUrlSet(
  input: Omit<GorgiasWidgetUnlockUrlParams, 'contextType'> & { claimId?: string | null },
): {
  basic_unlock_url: string;
  full_unlock_url: string;
  evidence_unlock_url: string;
} {
  const common = {
    appBaseUrl: input.appBaseUrl,
    widgetToken: input.widgetToken,
    email: input.email,
    ticketRef: input.ticketRef,
    orderRef: input.orderRef,
    claimId: input.claimId,
  };
  return {
    basic_unlock_url: buildGorgiasWidgetUnlockActionUrl({ ...common, contextType: 'basic_context' }),
    full_unlock_url: buildGorgiasWidgetUnlockActionUrl({ ...common, contextType: 'full_context' }),
    evidence_unlock_url: buildGorgiasWidgetUnlockActionUrl({
      ...common,
      contextType: 'evidence_summary',
    }),
  };
}
