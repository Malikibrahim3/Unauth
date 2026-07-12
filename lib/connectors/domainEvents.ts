/**
 * Connector-facing re-export of the domain event store. The canonical
 * implementation lives in `lib/events/domainEventStore.ts` (Phase 1).
 */
export {
  recordDomainEvent,
  DOMAIN_EVENT_TYPES,
  type DomainEventType,
  type RecordDomainEventInput,
} from '@/lib/events/domainEventStore';
