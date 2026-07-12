import { exceptionProjection } from '@/lib/events/handlers/exceptionProjection';
import { recomputeFinancialSummary } from '@/lib/events/handlers/financialProjection';

jest.mock('@/lib/events/handlers/financialProjection', () => ({ recomputeFinancialSummary: jest.fn() }));

describe('exception projection', () => {
  it('refreshes the linked case and recomputes, rather than creating financial values', async () => {
    const update = jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ error: null })) })) }));
    const client = { from: jest.fn(() => ({ update })) } as never;
    const result = await exceptionProjection(client, { id: 'e1', merchant_id: 'm1', event_type: 'case.exception_resolved', aggregate_type: 'case', aggregate_id: 'c1', payload: {}, occurred_at: null, recorded_at: '2026-07-12T00:00:00Z' });
    expect(result).toMatchObject({ applied: true });
    expect(recomputeFinancialSummary).toHaveBeenCalledWith(client, 'm1', 'c1');
  });
});
