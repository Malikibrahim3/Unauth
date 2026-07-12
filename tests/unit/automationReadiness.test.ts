import { calculateAutomationReadiness, READINESS_WEIGHTS, type ReadinessInputs } from '@/lib/automation/readiness';

const base: ReadinessInputs = {
  commerce: { connected: true, syncState: 'import_complete' }, helpdesk: { connected: true, syncState: 'import_complete' },
  tracking: { connected: true, syncState: 'import_complete' }, payments: { connected: true, syncState: 'import_complete' },
  warehouse: { connected: true, syncState: 'import_complete' }, activeRules: 1, unresolvedExceptions: 0,
  financialExceptions: 0, recoveryTasks: 0, activityCount: 10,
};

describe('automation readiness', () => {
  it('uses documented weights and caps the result', () => {
    expect(Object.values(READINESS_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(1);
    expect(calculateAutomationReadiness(base).score).toBe(100);
  });
  it('selects the largest useful next action', () => {
    const result = calculateAutomationReadiness({ ...base, commerce: { connected: false }, payments: { connected: false } });
    expect(result.recommendation?.label).toBe('Connect Shopify');
    expect(result.score).toBeLessThan(75);
  });
  it('penalises stale sources and improves when repaired', () => {
    const stale = calculateAutomationReadiness({ ...base, commerce: { connected: true, syncState: 'stale' } });
    expect(stale.score).toBeLessThan(calculateAutomationReadiness(base).score);
    expect(stale.recommendation?.label).toBe('Repair Shopify');
  });
  it('penalises a failed initial import', () => {
    expect(calculateAutomationReadiness({ ...base, tracking: { connected: true, syncState: 'sync_failed' } }).score).toBeLessThan(calculateAutomationReadiness(base).score);
  });
  it('updates after rule and exception changes', () => {
    const blocked = calculateAutomationReadiness({ ...base, activeRules: 0, unresolvedExceptions: 8 });
    expect(calculateAutomationReadiness(base).score).toBeGreaterThan(blocked.score);
  });
  it('reflects exceptions and workload without false precision', () => {
    const result = calculateAutomationReadiness({ ...base, unresolvedExceptions: 12, financialExceptions: 4, recoveryTasks: 5 });
    expect(result.score).toBeLessThan(100);
    expect(result.workload).toBe('More than 1 hour/day');
  });
  it('uses a contextual early-stage state', () => {
    const empty = calculateAutomationReadiness({ ...base, commerce: { connected: false }, helpdesk: { connected: false }, tracking: { connected: false }, payments: { connected: false }, warehouse: { connected: false }, activeRules: 0, activityCount: 0 });
    expect(empty.earlyStage).toBe(true);
    expect(empty.score).toBeGreaterThanOrEqual(0);
    expect(empty.score).toBeLessThanOrEqual(100);
    expect(empty.workload).toMatch(/Not enough activity/);
  });
});
