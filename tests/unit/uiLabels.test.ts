import { label, humanise } from '@/lib/ui/labels';

describe('ui label layer', () => {
  it('maps case statuses to merchant-facing copy', () => {
    expect(label('caseStatus', 'awaiting_carrier_response')).toBe('Waiting on carrier');
    expect(label('caseStatus', 'ready_for_decision')).toBe('Ready for decision');
    expect(label('caseStatus', 'resolved_refunded')).toBe('Refunded');
  });

  it('kills the "Three Pl" casing bug at the root', () => {
    expect(label('ownerType', 'three_pl')).toBe('3PL');
    expect(label('counterparty', '3pl')).toBe('3PL');
    expect(label('attribution', 'three_pl_claim')).toBe('3PL claim');
  });

  it('maps recoverability, actions, loss categories and priorities', () => {
    expect(label('recoverability', 'unknown')).toBe('Not yet assessed');
    expect(label('requestedAction', 'store_credit')).toBe('Store credit');
    expect(label('lossCategory', 'fulfilment_or_warehouse_error')).toBe('Fulfilment error');
    expect(label('workPriority', 'urgent')).toBe('Urgent');
  });

  it('re-exports claim-type labels from the SSOT', () => {
    expect(label('claimType', 'item_not_received')).toBe('Item not received');
  });

  it('falls back to a humanised form for unmapped values (never raw snake_case)', () => {
    expect(label('caseStatus', 'some_new_state')).toBe('Some new state');
    expect(humanise('awaiting_carrier_response')).toBe('Awaiting carrier response');
  });

  it('returns empty string for null/undefined', () => {
    expect(label('caseStatus', null)).toBe('');
    expect(label('caseStatus', undefined)).toBe('');
  });
});
