/**
 * Case projection handler. Placeholder read-model projection for `case.*`
 * events: the case row itself is already updated transactionally by
 * `transitionCase`, so this handler currently only acknowledges the event so
 * downstream read-model work (customer history, queues) has a hook point.
 *
 * Idempotent by construction — it performs no mutation yet.
 *
 * See ARCHITECTURE.md for the canonical case-state owner.
 */
import type { DomainEventHandler } from '@/lib/events/handlers/types';

export const caseProjection: DomainEventHandler = async (_client, event) => {
  if (!event.event_type.startsWith('case.')) return { applied: false, detail: 'ignored' };
  return { applied: false, detail: 'acknowledged' };
};
