import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveAnalyticsScope } from '@/lib/analytics/server/scope';
import { getFinancialAnalytics, getFinancialAnalyticsRecords } from '@/lib/analytics/server/rpc';

describe('distinctive analytics contracts', () => {
  it('resolves one stable, normalized, merchant-free scope', () => {
    const asOf = new Date('2026-08-13T12:00:00.000Z');
    const scope = resolveAnalyticsScope(
      { range: '30d', timezone: 'Europe/London', currency: ' gbp ' },
      { asOf },
    );

    expect(scope).toEqual({
      range: '30d',
      start: '2026-07-14T12:00:00.000Z',
      end: '2026-08-13T12:00:00.000Z',
      timezone: 'Europe/London',
      currency: 'GBP',
      comparison: 'none',
      asOf: '2026-08-13T12:00:00.000Z',
    });
    expect(scope).not.toHaveProperty('merchantId');
  });

  it('rejects invalid timezone, bounds, currency, and oversized custom ranges', () => {
    const asOf = new Date('2026-08-13T12:00:00.000Z');
    expect(() => resolveAnalyticsScope({ timezone: 'Not/AZone' }, { asOf })).toThrow('analytics_scope_invalid_timezone');
    expect(() => resolveAnalyticsScope({ timezone: 'UTC', currency: 'US' }, { asOf })).toThrow('analytics_scope_invalid_currency');
    expect(() => resolveAnalyticsScope({ range: 'custom', timezone: 'UTC' }, { asOf })).toThrow('analytics_scope_custom_bounds_required');
    expect(() => resolveAnalyticsScope({ range: 'custom', timezone: 'UTC', start: '2024-01-01T00:00:00Z', end: '2026-01-01T00:00:00Z' }, { asOf })).toThrow('analytics_scope_range_too_large');
  });

  it('passes tenant identity only to the service RPC and validates provenance', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        data: { series: [], drilldownRoute: '/financials/reports/records' },
        generatedAt: '2026-08-13T12:00:00.000Z',
        sourceDataWatermark: null,
        completeness: 'missing',
        issues: [{ code: 'NO_FINANCIAL_HISTORY', explanation: 'No history.', affectedMeasures: ['all'], excludedRecordCount: 0 }],
        recordCount: 0,
        currencies: ['GBP'],
      },
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;
    const scope = resolveAnalyticsScope(
      { range: '7d', timezone: 'UTC', currency: 'GBP' },
      { asOf: new Date('2026-08-13T12:00:00.000Z') },
    );

    const result = await getFinancialAnalytics(
      { client, merchantId: 'merchant-1', actorId: 'actor-1' },
      scope,
    );

    expect(result.completeness).toBe('missing');
    expect(rpc).toHaveBeenCalledWith('get_financial_analytics', expect.objectContaining({
      p_merchant_id: 'merchant-1',
      p_actor_id: 'actor-1',
      p_timezone: 'UTC',
      p_currency: 'GBP',
      p_as_of: '2026-08-13T12:00:00.000Z',
    }));
  });

  it('keeps exact ledger drill-down scope and pagination server-side', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: {
        data: { records: [], totalCount: 0, signedTotalMinor: 0, measure: 'recovered', start: '2026-08-12T00:00:00.000Z', end: '2026-08-13T00:00:00.000Z', currency: 'GBP' },
        generatedAt: '2026-08-13T12:00:00.000Z',
        sourceDataWatermark: null,
        completeness: 'missing',
        issues: [],
        recordCount: 0,
        currencies: ['GBP'],
      },
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;
    const scope = resolveAnalyticsScope({
      range: 'custom', timezone: 'UTC', currency: 'GBP',
      start: '2026-08-12T00:00:00.000Z', end: '2026-08-13T00:00:00.000Z',
    }, { asOf: new Date('2026-08-13T12:00:00.000Z') });

    await getFinancialAnalyticsRecords(
      { client, merchantId: 'merchant-1', actorId: 'actor-1' },
      { scope, measure: 'recovered', page: 2, pageSize: 25 },
    );

    expect(rpc).toHaveBeenCalledWith('get_financial_analytics_records', expect.objectContaining({
      p_start_at: '2026-08-12T00:00:00.000Z',
      p_end_at: '2026-08-13T00:00:00.000Z',
      p_currency: 'GBP',
      p_measure: 'recovered',
      p_as_of: '2026-08-13T12:00:00.000Z',
      p_limit: 25,
      p_offset: 25,
    }));
  });
});
