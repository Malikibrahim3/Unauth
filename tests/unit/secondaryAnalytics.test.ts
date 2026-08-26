import {
  buildFlowRunAnalytics,
  buildImportErrorContributions,
  buildRuleEvaluationAnalytics,
} from '@/lib/visualisation/secondaryAnalytics';

describe('selective secondary analytics', () => {
  it('keeps rule recommendations separate from match counts', () => {
    const model = buildRuleEvaluationAnalytics([
      { rule_id: 'r1', recommendation: 'request_evidence', evaluated_at: '2026-08-01T10:00:00Z' },
      { rule_id: 'r1', recommendation: 'request_evidence', evaluated_at: '2026-08-02T10:00:00Z' },
      { rule_id: null, recommendation: null, evaluated_at: '2026-08-03T10:00:00Z' },
    ], new Map([['r1', 'High-value review']]));
    expect(model).toMatchObject({ total: 3, matched: 2, unmatched: 1 });
    expect(model.hits[0]).toMatchObject({ label: 'High-value review', value: 2, href: '/controls/rules/r1' });
    expect(model.outcomes.map((item) => [item.label, item.value])).toEqual([
      ['Request evidence', 2],
      ['No rule matched', 1],
    ]);
  });

  it('pairs flow success rate with raw runs and excludes incomplete durations', () => {
    const model = buildFlowRunAnalytics([
      { id: 'a', status: 'completed', error: null, started_at: '2026-08-01T10:00:00Z', completed_at: '2026-08-01T10:00:00.500Z' },
      { id: 'b', status: 'not_matched', error: null, started_at: '2026-08-01T11:00:00Z', completed_at: '2026-08-01T11:00:02Z' },
      { id: 'c', status: 'matched', error: 'connector_failed: unavailable', started_at: '2026-08-02T10:00:00Z', completed_at: null },
    ]);
    expect(model).toMatchObject({ total: 3, successful: 2, successRate: 67 });
    expect(model.durations.map((item) => item.value)).toEqual([1, 1, 0, 0]);
    expect(model.failures[0]).toMatchObject({ label: 'Connector failed', value: 1 });
  });

  it('ranks retained import errors without inventing zero categories', () => {
    expect(buildImportErrorContributions([
      { code: 'invalid_currency' },
      { code: 'missing_id' },
      { code: 'invalid_currency' },
    ])).toEqual([
      { key: 'invalid_currency', label: 'Invalid currency', value: 2, detail: '2 invalid rows' },
      { key: 'missing_id', label: 'Missing id', value: 1, detail: '1 invalid row' },
    ]);
  });
});
