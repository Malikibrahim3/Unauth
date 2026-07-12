import { connectionFreshness, coverageFromRecords } from '@/lib/integrations/health';
import { hasGateReadyConnection } from '@/lib/integrations/gateReadiness';

describe('integration health', () => {
  it('derives coverage from records rather than credentials', () => {
    const coverage = coverageFromRecords([{ source_entity_type: 'order', freshness_state: 'fresh', sync_state: 'current' }, { source_entity_type: 'ticket', freshness_state: 'stale', sync_state: 'current' }]);
    expect(coverage.find((row) => row.category === 'orders')).toMatchObject({ status: 'complete', recordCount: 1 });
    expect(coverage.find((row) => row.category === 'support_tickets')).toMatchObject({ status: 'stale', recordCount: 1 });
    expect(coverage.find((row) => row.category === 'returns')).toMatchObject({ status: 'missing', recordCount: 0 });
  });
  it('distinguishes unknown and stale timestamps', () => {
    expect(connectionFreshness(null, Date.now())).toBe('unknown');
    expect(connectionFreshness('2020-01-01T00:00:00Z', Date.now())).toBe('stale');
  });
  it('fails gate readiness closed for stale, errored, or unverified webhook connections', () => {
    expect(hasGateReadyConnection([
      { provider_id: 'shopify', status: 'connected', freshness: 'stale', activeIssueCount: 0 },
    ], 'shopify')).toBe(false);
    expect(hasGateReadyConnection([
      { provider_id: 'shopify', status: 'connected', freshness: 'current', activeIssueCount: 1 },
    ], 'shopify')).toBe(false);
    expect(hasGateReadyConnection([
      { provider_id: 'gorgias', status: 'connected', freshness: 'current', activeIssueCount: 0, webhook_status: null },
    ], 'gorgias', { requireWebhook: true })).toBe(false);
  });
  it('accepts only a current, issue-free connection with required webhook health', () => {
    expect(hasGateReadyConnection([
      { provider_id: 'gorgias', status: 'connected', freshness: 'current', activeIssueCount: 0, webhook_status: 'active' },
    ], 'gorgias', { requireWebhook: true })).toBe(true);
  });
});
