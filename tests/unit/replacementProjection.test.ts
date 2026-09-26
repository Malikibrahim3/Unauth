import type { SupabaseClient } from '@supabase/supabase-js';
import { replacementProjection } from '@/lib/events/handlers/replacementProjection';
import { corroborateReplacementHandoff } from '@/lib/claims/replacement';

jest.mock('@/lib/claims/replacement', () => ({
  corroborateReplacementHandoff: jest.fn(),
}));

const event = {
  id: 'event-1', merchant_id: 'merchant-1', event_type: 'replacement.created',
  aggregate_type: 'replacement', aggregate_id: 'replacement-1', payload: {},
  occurred_at: '2026-09-06T10:00:00.000Z', recorded_at: '2026-09-06T10:00:01.000Z',
};

describe('replacementProjection', () => {
  beforeEach(() => jest.resetAllMocks());

  it('delegates exact source replacement corroboration to the idempotent storage boundary', async () => {
    (corroborateReplacementHandoff as jest.Mock).mockResolvedValue({ matched: true, replayed: false });
    const result = await replacementProjection({} as SupabaseClient, event);
    expect(corroborateReplacementHandoff).toHaveBeenCalledWith(expect.anything(), {
      merchantId: 'merchant-1', sourceReplacementId: 'replacement-1', observedAt: '2026-09-06T10:00:00.000Z',
    });
    expect(result).toEqual({ applied: true, detail: 'replacement_corroborated' });
  });

  it('does not apply unrelated or unidentifiable events', async () => {
    expect(await replacementProjection({} as SupabaseClient, { ...event, event_type: 'refund.created' })).toMatchObject({ applied: false });
    expect(await replacementProjection({} as SupabaseClient, { ...event, aggregate_id: null })).toEqual({ applied: false, detail: 'missing_source_replacement_id' });
    expect(corroborateReplacementHandoff).not.toHaveBeenCalled();
  });
});
