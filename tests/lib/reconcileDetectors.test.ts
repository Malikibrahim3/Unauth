jest.mock('@/lib/exceptions/store', () => ({ raiseException: jest.fn() }));

import * as detectors from '@/lib/reconciliation/detectors';
import { raiseException } from '@/lib/exceptions/store';

const raise = raiseException as jest.Mock;
const M = 'm-1';
const NOW = Date.parse('2026-07-12T00:00:00.000Z');

/** Resolve each table's rows for the terminal await; groups are done in JS. */
function client(byTable: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const b: Record<string, unknown> = {};
      const chain = () => b;
      for (const m of ['select', 'eq', 'in', 'is', 'not', 'lt', 'contains', 'order', 'limit']) b[m] = chain;
      b.then = (resolve: (v: unknown) => unknown) => resolve({ data: byTable[table] ?? [], error: null });
      return b;
    },
  } as never as import('@supabase/supabase-js').SupabaseClient;
}

beforeEach(() => raise.mockResolvedValue({ created: true, id: 'e', status: 'open' }));
afterEach(() => jest.clearAllMocks());

function lastRaise() { return raise.mock.calls.at(-1)?.[2] as Record<string, unknown>; }

describe('reconciliation detectors', () => {
  it('unmatched refund → probable unmatched_refund with stable key', async () => {
    const r = await detectors.detectUnmatchedRefunds(client({ source_refunds: [{ id: 'r1', source_order_id: 'o1', amount: 20, currency: 'GBP' }], support_payout_cases: [] }), M);
    expect(r).toMatchObject({ found: 1, raised: 1 });
    expect(lastRaise()).toMatchObject({ exceptionType: 'unmatched_refund', confidence: 'probable', dedupKey: 'reconcile:unmatched_refund:r1' });
  });

  it('changed refund amount → conflicting_financials only when it differs', async () => {
    const rows = { source_refunds: [{ id: 'r1', source_order_id: 'o1', amount: 25, currency: 'GBP' }], support_payout_cases: [{ id: 'c1', source_order_id: 'o1', refund_amount: 20, currency: 'GBP' }] };
    const r = await detectors.detectChangedRefundAmounts(client(rows), M);
    expect(r.raised).toBe(1);
    expect(lastRaise()).toMatchObject({ exceptionType: 'conflicting_financials', supportPayoutCaseId: 'c1', dedupKey: 'reconcile:refund_amount:r1:25' });
  });

  it('changed refund amount → no exception when equal', async () => {
    const rows = { source_refunds: [{ id: 'r1', source_order_id: 'o1', amount: 20 }], support_payout_cases: [{ id: 'c1', source_order_id: 'o1', refund_amount: 20 }] };
    expect((await detectors.detectChangedRefundAmounts(client(rows), M)).raised).toBe(0);
  });

  it('unlinked replacement → ambiguous_replacement', async () => {
    await detectors.detectUnlinkedReplacements(client({ source_replacements: [{ id: 'rp1', source_order_id: 'o1' }] }), M);
    expect(lastRaise()).toMatchObject({ exceptionType: 'ambiguous_replacement', dedupKey: 'reconcile:unlinked_replacement:rp1' });
  });

  it('unlinked received return → other', async () => {
    await detectors.detectUnlinkedReturns(client({ source_returns: [{ id: 'rt1', received_at: '2026-01-01', status: 'received' }] }), M);
    expect(lastRaise()).toMatchObject({ exceptionType: 'other', dedupKey: 'reconcile:unlinked_return:rt1' });
  });

  it('delivery outcome after case update → stale_source_data', async () => {
    const rows = { source_shipments: [{ id: 's1', source_order_id: 'o1', status: 'delivered', delivered_at: '2026-02-01' }], support_payout_cases: [{ id: 'c1', source_order_id: 'o1', status: 'open', updated_at: '2026-01-01' }] };
    const r = await detectors.detectDeliveryOutcomeUpdates(client(rows), M);
    expect(r.raised).toBe(1);
    expect(lastRaise()).toMatchObject({ exceptionType: 'stale_source_data', supportPayoutCaseId: 'c1' });
  });

  it('delivery before case update → no exception', async () => {
    const rows = { source_shipments: [{ id: 's1', source_order_id: 'o1', delivered_at: '2026-01-01' }], support_payout_cases: [{ id: 'c1', source_order_id: 'o1', status: 'open', updated_at: '2026-02-01' }] };
    expect((await detectors.detectDeliveryOutcomeUpdates(client(rows), M)).raised).toBe(0);
  });

  it('stale open case → stale_source_data', async () => {
    await detectors.detectStaleOpenCases(client({ support_payout_cases: [{ id: 'c1', status: 'open', updated_at: '2026-01-01' }] }), M, NOW);
    expect(lastRaise()).toMatchObject({ exceptionType: 'stale_source_data', dedupKey: 'reconcile:stale_case:c1' });
  });

  it('closure-eligible case → other', async () => {
    const rows = { case_financial_summaries: [{ support_payout_case_id: 'c1', exposed_minor: 0, confirmed_loss_minor: 500, known_states: ['exposed', 'confirmed_loss'] }], support_payout_cases: [{ id: 'c1', status: 'open' }] };
    const r = await detectors.detectClosureEligibleCases(client(rows), M);
    expect(r.raised).toBe(1);
    expect(lastRaise()).toMatchObject({ exceptionType: 'other', supportPayoutCaseId: 'c1', dedupKey: 'reconcile:closure_eligible:c1' });
  });

  it('duplicate financial entries → conflicting_financials (unknown)', async () => {
    const rows = { case_financial_entries: [
      { id: 'f1', support_payout_case_id: 'c1', source_record_id: 'sr1', direction: 'debit', amount_minor: 500, state: 'confirmed' },
      { id: 'f2', support_payout_case_id: 'c1', source_record_id: 'sr1', direction: 'debit', amount_minor: 500, state: 'confirmed' },
    ] };
    const r = await detectors.detectDuplicateFinancials(client(rows), M);
    expect(r.raised).toBe(1);
    expect(lastRaise()).toMatchObject({ exceptionType: 'conflicting_financials', confidence: 'unknown' });
  });

  it('dispute past deadline → UNKNOWN unsupported_external_outcome', async () => {
    await detectors.detectUnresolvedDisputeOutcomes(client({ loss_cases: [{ id: 'l1', support_payout_case_id: 'c1', case_category: 'chargeback_or_payment_dispute', status: 'submitted', claim_deadline_at: '2026-01-01' }] }), M, NOW);
    expect(lastRaise()).toMatchObject({ exceptionType: 'unsupported_external_outcome', confidence: 'unknown' });
  });

  it('recovery past deadline → UNKNOWN missing_recovery_result', async () => {
    await detectors.detectMissingRecoveryOutcomes(client({ recovery_cases: [{ id: 'rc1', support_payout_case_id: 'c1', status: 'submitted', deadline_at: '2026-01-01' }] }), M, NOW);
    expect(lastRaise()).toMatchObject({ exceptionType: 'missing_recovery_result', confidence: 'unknown' });
  });

  it('probable match → match_uncertainty; ambiguous when >1 candidate', async () => {
    const rows = { record_match_candidates: [
      { id: 'k1', subject_entity_type: 'order', subject_entity_id: 'o1', candidate_entity_type: 'order', candidate_entity_id: 'o2', confidence: 0.7 },
      { id: 'k2', subject_entity_type: 'order', subject_entity_id: 'o1', candidate_entity_type: 'order', candidate_entity_id: 'o3', confidence: 0.6 },
    ] };
    const r = await detectors.detectProbableMatches(client(rows), M);
    expect(r.raised).toBe(1);
    const raised = lastRaise();
    expect(raised).toMatchObject({ exceptionType: 'match_uncertainty', dedupKey: 'reconcile:match:order:o1' });
    expect((raised.context as { candidate_ids: string[] }).candidate_ids).toEqual(['k1', 'k2']);
    expect((raised.context as { is_match_exception: boolean }).is_match_exception).toBe(true);
  });

  it('is idempotent — already-present exceptions count as found, not raised', async () => {
    raise.mockResolvedValue({ created: false, id: 'e', status: 'open' });
    const r = await detectors.detectUnmatchedRefunds(client({ source_refunds: [{ id: 'r1', source_order_id: 'o1', amount: 1 }], support_payout_cases: [] }), M);
    expect(r).toMatchObject({ found: 1, raised: 0 });
  });
});
