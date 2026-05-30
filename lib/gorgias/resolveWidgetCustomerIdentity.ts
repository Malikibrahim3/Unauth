import type { SupabaseClient } from '@supabase/supabase-js';
import { maskEmail } from '@/lib/privacy/mask';
import { gorgiasWidgetLog } from '@/lib/gorgias/widgetLog';
import { fetchGorgiasTicketById } from '@/lib/support/gorgias/fetchTicket';
import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import {
  buildGorgiasEmailExclusionSet,
  pickWidgetEmailFromQueryParams,
  resolveGorgiasTicketCustomerEmail,
} from '@/lib/support/gorgias/ticketCustomerEmail';

export type WidgetCustomerEmailSource =
  | 'query_email'
  | 'query_customer_email'
  | 'gorgias_ticket_api'
  | 'unresolved';

export type ResolvedWidgetCustomerIdentity = {
  rawEmail: string;
  source: WidgetCustomerEmailSource;
  ticketId: string | null;
  /** True when query params were missing/invalid and API fallback did not yield an email. */
  identityUnresolved: boolean;
};

function isUnresolvedTemplate(value: string): boolean {
  return value.includes('{{') || value.includes('}}');
}

export async function resolveWidgetCustomerIdentity(
  service: SupabaseClient,
  input: {
    merchantId: string;
    emailParam: string;
    customerEmailParam: string;
    ticketIdParam: string;
  }
): Promise<ResolvedWidgetCustomerIdentity> {
  const ticketId = input.ticketIdParam.trim() || null;
  const apiAccess = await getActiveGorgiasMerchantApiAccess(service, input.merchantId);
  const exclude = buildGorgiasEmailExclusionSet([
    apiAccess?.credentials.email ?? null,
  ]);

  const fromQuery = pickWidgetEmailFromQueryParams({
    email: input.emailParam,
    customerEmail: input.customerEmailParam,
    exclude,
  });

  if (fromQuery) {
    const identity: ResolvedWidgetCustomerIdentity = {
      rawEmail: fromQuery.rawEmail,
      source: fromQuery.querySource === 'email' ? 'query_email' : 'query_customer_email',
      ticketId,
      identityUnresolved: false,
    };
    logResolvedIdentity(identity);
    return identity;
  }

  const queryLooksWrong =
    Boolean(input.emailParam.trim() && !isUnresolvedTemplate(input.emailParam)) ||
    Boolean(input.customerEmailParam.trim() && !isUnresolvedTemplate(input.customerEmailParam));

  if (ticketId && apiAccess) {
    try {
      const ticket = await fetchGorgiasTicketById({
        providerBaseUrl: apiAccess.providerBaseUrl,
        credentials: apiAccess.credentials,
        ticketId,
      });
      const resolved = resolveGorgiasTicketCustomerEmail(ticket, { excludeEmails: exclude });
      if (resolved) {
        const identity: ResolvedWidgetCustomerIdentity = {
          rawEmail: resolved.email,
          source: 'gorgias_ticket_api',
          ticketId,
          identityUnresolved: false,
        };
        logResolvedIdentity(identity, { ticketEmailSource: resolved.source });
        return identity;
      }

      const relaxedResolved = resolveGorgiasTicketCustomerEmail(ticket);
      if (
        relaxedResolved &&
        (relaxedResolved.source === 'message_sender' ||
          relaxedResolved.source === 'message_source_from')
      ) {
        const identity: ResolvedWidgetCustomerIdentity = {
          rawEmail: relaxedResolved.email,
          source: 'gorgias_ticket_api',
          ticketId,
          identityUnresolved: false,
        };
        logResolvedIdentity(identity, {
          ticketEmailSource: relaxedResolved.source,
          acceptedExcludedNonAgentSender: true,
        });
        return identity;
      }
    } catch (err) {
      gorgiasWidgetLog('customer_identity.ticket_fetch_failed', {
        ticketId,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const identity: ResolvedWidgetCustomerIdentity = {
    rawEmail: input.emailParam.trim() || input.customerEmailParam.trim(),
    source: 'unresolved',
    ticketId,
    identityUnresolved: queryLooksWrong || Boolean(ticketId),
  };
  logResolvedIdentity(identity);
  return identity;
}

function logResolvedIdentity(
  identity: ResolvedWidgetCustomerIdentity,
  extra: Record<string, unknown> = {}
): void {
  gorgiasWidgetLog('customer_identity.resolved', {
    ticketId: identity.ticketId,
    emailSource: identity.source,
    maskedEmail: maskEmail(identity.rawEmail),
    identityUnresolved: identity.identityUnresolved,
    ...extra,
  });
}
