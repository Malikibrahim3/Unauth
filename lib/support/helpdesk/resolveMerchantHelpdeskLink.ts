import type { SupabaseClient } from '@supabase/supabase-js';

import { evaluateFreshdeskHelpdeskLink } from '@/lib/support/freshdesk/helpdeskLinkStatus';
import { getMerchantFreshdeskSupportConnection } from '@/lib/support/freshdesk/settingsConnection';
import { evaluateGorgiasHelpdeskLink } from '@/lib/support/gorgias/helpdeskLinkStatus';
import { getMerchantGorgiasSupportConnection } from '@/lib/support/gorgias/settingsConnection';
import { evaluateZendeskHelpdeskLink } from '@/lib/support/zendesk/helpdeskLinkStatus';
import { getMerchantZendeskSupportConnection } from '@/lib/support/zendesk/settingsConnection';

import type { HelpdeskProvider } from '@/lib/connections/getConnectionState';

export type MerchantHelpdeskLinkResolution = {
  provider: HelpdeskProvider | null;
  /** True when at least one helpdesk has API credentials for ticket ingest. */
  linked: boolean;
};

/**
 * Resolves whether the merchant has a helpdesk that can ingest and link tickets.
 * Sidebar-only Zendesk verify does not count as linked.
 */
export async function resolveMerchantHelpdeskLink(
  serviceClient: SupabaseClient,
  merchantId: string,
): Promise<MerchantHelpdeskLinkResolution> {
  const [gorgias, zendesk, freshdesk] = await Promise.all([
    getMerchantGorgiasSupportConnection(serviceClient, merchantId),
    getMerchantZendeskSupportConnection(serviceClient, merchantId),
    getMerchantFreshdeskSupportConnection(serviceClient, merchantId),
  ]);

  const candidates: Array<{ provider: HelpdeskProvider; linked: boolean }> = [
    { provider: 'gorgias', linked: evaluateGorgiasHelpdeskLink(gorgias).helpdeskLinked },
    { provider: 'zendesk', linked: evaluateZendeskHelpdeskLink(zendesk).helpdeskLinked },
    { provider: 'freshdesk', linked: evaluateFreshdeskHelpdeskLink(freshdesk).helpdeskLinked },
  ];

  const active = candidates.filter((c) => c.linked);
  if (active.length === 0) {
    return { provider: null, linked: false };
  }

  return { provider: active[0].provider, linked: true };
}
