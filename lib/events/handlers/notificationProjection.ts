/**
 * Notification projection handler. Placeholder for routing case/task events to
 * the responsible owner. Notification tables land in a later phase; this handler
 * acknowledges the event so its delivery completes and no dead-letter builds up.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §6 and §9.
 */
import type { DomainEventHandler } from '@/lib/events/handlers/types';

export const notificationProjection: DomainEventHandler = async (_client, _event) => {
  return { applied: false, detail: 'acknowledged' };
};
