import { getAutomationMetrics } from '@/lib/reconciliation/metrics';

function client(data: Record<string, unknown[]>) {
  return { from(table: string) { const builder: Record<string, unknown> = {}; const chain = () => builder; for (const method of ['select', 'eq', 'limit']) builder[method] = chain; builder.then = (resolve: (value: unknown) => unknown) => resolve({ data: data[table] ?? [], error: null }); return builder; } } as never;
}

describe('automation metrics', () => {
  it('separates automated, probable, unknown and unresolved outcomes', async () => {
    const metrics = await getAutomationMetrics(client({
      support_payout_cases: [{ id: 'c1' }, { id: 'c2' }],
      domain_events: [{ aggregate_id: 'c1', event_type: 'case.updated', actor_type: 'system' }, { aggregate_id: 'c1', event_type: 'case.exception_resolved', actor_type: 'user' }],
      case_exceptions: [{ confidence: 'probable', status: 'open', created_at: new Date().toISOString() }, { confidence: 'unknown', status: 'resolved', created_at: new Date().toISOString() }],
    }), 'm1');
    expect(metrics).toMatchObject({ automaticOutcomes: 1, probableOutcomes: 1, unknownOutcomes: 1, unresolvedExceptions: 1, automationCompletionPercent: 50, averageMerchantInputsPerCase: 0.5 });
  });
});
