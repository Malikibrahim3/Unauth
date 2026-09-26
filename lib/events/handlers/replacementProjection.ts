import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { corroborateReplacementHandoff } from '@/lib/claims/replacement';

/**
 * Correlates a canonical source_replacements row with one exact manual
 * authorisation item. The storage RPC owns deduplication and state transitions;
 * this handler never creates a shipment, financial outcome, or recovery value.
 */
export const replacementProjection: DomainEventHandler = async (client, event) => {
  if (!['replacement.created', 'replacement.updated'].includes(event.event_type)) {
    return { applied: false, detail: 'ignored' };
  }
  if (!event.aggregate_id) return { applied: false, detail: 'missing_source_replacement_id' };

  const result = await corroborateReplacementHandoff(client, {
    merchantId: event.merchant_id,
    sourceReplacementId: event.aggregate_id,
    observedAt: event.occurred_at,
  });
  return {
    applied: result.matched,
    detail: result.matched
      ? result.replayed ? 'already_corroborated' : 'replacement_corroborated'
      : result.reason ?? 'no_exact_authorisation',
  };
};
