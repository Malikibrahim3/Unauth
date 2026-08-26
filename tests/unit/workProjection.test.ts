import { workIntentForEvent } from '@/lib/events/handlers/workProjection';
import type { DomainEventRecord } from '@/lib/events/handlers/types';

function event(eventType: string, payload: Record<string, unknown>): DomainEventRecord {
  return {
    id: 'event-1',
    merchant_id: 'merchant-1',
    event_type: eventType,
    aggregate_type: eventType.startsWith('external_action.') ? 'external_action' : 'case',
    aggregate_id: eventType.startsWith('external_action.') ? 'action-1' : 'case-1',
    payload,
    actor_type: 'user',
    actor_id: 'user-1',
    occurred_at: '2026-08-23T12:00:00.000Z',
    recorded_at: '2026-08-23T12:00:00.000Z',
  };
}

describe('Work domain-event projection intent', () => {
  it.each([
    ['case.created', { case_id: 'case-1' }, 'evidence_gap'],
    ['investigation.created', { case_id: 'case-1', investigation_id: 'investigation-1' }, 'investigation'],
    ['investigation.response_recorded', { case_id: 'case-1', investigation_id: 'investigation-1' }, 'decision'],
    ['external_action.handoff_ready', { case_id: 'case-1', action_id: 'action-1', state_version: 2 }, 'external_handoff'],
    ['external_action.indeterminate', { case_id: 'case-1', action_id: 'action-1', state_version: 5 }, 'external_outcome'],
    ['recovery.created', { recovery_case_id: 'recovery-1' }, 'recovery_deadline'],
    ['recovery.submitted', { recovery_case_id: 'recovery-1' }, 'provider_chase'],
    ['connection.sync_failed', { connection_id: 'connection-1' }, 'source_failure'],
  ])('maps %s to a durable %s task', (eventType, payload, expectedKind) => {
    expect(workIntentForEvent(event(eventType, payload))).toMatchObject({ taskKind: expectedKind });
  });

  it('keeps merchant-reported provider work blocked until a source outcome arrives', () => {
    expect(workIntentForEvent(event('external_action.merchant_reported_attempt', {
      case_id: 'case-1', action_id: 'action-1', state_version: 3,
    }))).toMatchObject({ status: 'blocked', waitingParty: 'provider' });
  });
});
