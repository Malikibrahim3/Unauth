import { getActiveGorgiasMerchantApiAccess } from '@/lib/support/gorgias/merchantApiAccess';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';
import { formatCurrency } from '@/lib/utils/format';
import { env } from '@/lib/utils/env';

export const UNAUTH_HOLD_TAG = 'unauth-hold';
export const UNAUTH_RESOLVED_TAG = 'unauth-resolved';

export type HoldTagRule = {
  rule_name: string;
  conditions_fired: string[];
};

function money(amount: number, currency: string): string {
  return formatCurrency(amount, currency);
}

export function buildHoldInternalNote(input: {
  caseUrl: string;
  moneyAtRisk: number;
  currency: string;
  triggeredRules: HoldTagRule[];
  recoveryRoutes: string[];
}): string {
  const rules = input.triggeredRules.length
    ? input.triggeredRules
        .map((rule) => {
          const conditions = rule.conditions_fired.length ? ` (${rule.conditions_fired.join(', ')})` : '';
          return `Rule "${rule.rule_name}"${conditions}`;
        })
        .join('; ')
    : 'Review rule triggered';
  const routes = input.recoveryRoutes.length ? input.recoveryRoutes.join('; ') : 'No recovery route identified yet';

  return [
    `Unauth review gate triggered: ${rules}.`,
    `Review required before refund or reship.`,
    `Money at risk: ${money(input.moneyAtRisk, input.currency)}.`,
    `Recovery routes: ${routes}.`,
    `Full case: ${input.caseUrl}`,
  ].join(' ');
}

export async function applyHoldTag(input: {
  client: unknown;
  merchantId: string;
  ticketId: string;
  caseUrl: string;
  moneyAtRisk: number;
  currency: string;
  triggeredRules: HoldTagRule[];
  recoveryRoutes: string[];
  /**
   * Pre-rendered plain-English recommendation block from the decision engine.
   * When provided it is used verbatim as the internal note; otherwise the
   * legacy single-line summary is built from the rules + routes.
   */
  noteBody?: string;
}): Promise<{ attempted: boolean; ok: boolean; error?: string }> {
  if (env.GORGIAS_BOUNDED_WRITEBACK_ENABLED !== 'true') {
    return { attempted: false, ok: false, error: 'gorgias_bounded_writeback_gated_off' };
  }
  const access = await getActiveGorgiasMerchantApiAccess(input.client, input.merchantId);
  if (!access) return { attempted: false, ok: false, error: 'gorgias_not_connected' };

  try {
    const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
    await gorgiasApiRequest<unknown>(
      apiBase,
      `/tickets/${encodeURIComponent(input.ticketId)}/tags`,
      access.credentials,
      {
        method: 'DELETE',
        body: JSON.stringify({ names: [UNAUTH_HOLD_TAG] }),
      },
    ).catch(() => null);
    await gorgiasApiRequest<unknown>(
      apiBase,
      `/tickets/${encodeURIComponent(input.ticketId)}/tags`,
      access.credentials,
      {
        method: 'POST',
        body: JSON.stringify({ names: [UNAUTH_HOLD_TAG] }),
      },
    );
    await gorgiasApiRequest<unknown>(
      apiBase,
      `/tickets/${encodeURIComponent(input.ticketId)}/messages`,
      access.credentials,
      {
        method: 'POST',
        body: JSON.stringify({
          channel: 'internal-note',
          source: { type: 'api' },
          body_text: input.noteBody ?? buildHoldInternalNote(input),
          from_agent: true,
        }),
      },
    );
    return { attempted: true, ok: true };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resolveHoldTag(input: {
  client: unknown;
  merchantId: string;
  ticketId: string | null | undefined;
  decision: string;
  caseUrl: string;
}): Promise<{ attempted: boolean; ok: boolean; error?: string }> {
  if (!input.ticketId) return { attempted: false, ok: false, error: 'missing_ticket_id' };
  if (env.GORGIAS_BOUNDED_WRITEBACK_ENABLED !== 'true') {
    return { attempted: false, ok: false, error: 'gorgias_bounded_writeback_gated_off' };
  }
  const access = await getActiveGorgiasMerchantApiAccess(input.client, input.merchantId);
  if (!access) return { attempted: false, ok: false, error: 'gorgias_not_connected' };

  try {
    const apiBase = gorgiasApiBaseUrl(access.providerBaseUrl);
    await gorgiasApiRequest<unknown>(
      apiBase,
      `/tickets/${encodeURIComponent(input.ticketId)}/tags`,
      access.credentials,
      {
        method: 'POST',
        body: JSON.stringify({ names: [UNAUTH_RESOLVED_TAG] }),
      },
    );
    await gorgiasApiRequest<unknown>(
      apiBase,
      `/tickets/${encodeURIComponent(input.ticketId)}/messages`,
      access.credentials,
      {
        method: 'POST',
        body: JSON.stringify({
          channel: 'internal-note',
          source: { type: 'api' },
          body_text: `Unauth review resolved. Decision recorded: ${input.decision}. Full case: ${input.caseUrl}`,
          from_agent: true,
        }),
      },
    );
    return { attempted: true, ok: true };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
