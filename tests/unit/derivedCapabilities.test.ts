import {
  buildActorActionSummary,
  buildHoldRateTimeseries,
  buildRestatementPreview,
  buildSourceUptimeCells,
  deriveCreditBurnForecast,
  deriveCustodyLegs,
  deriveDisputeCountdown,
  deriveDuration,
  deriveLineItemMargin,
  derivePartnerStatistics,
  deriveRecoveryAgeing,
  deriveTicketResponseTimes,
} from '@/lib/capabilities/derived';
import { renderDigestPreview } from '@/lib/notifications/digest';

describe('derived capability contracts', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');

  it('keeps completed and live durations distinct', () => {
    expect(deriveDuration('2026-08-31T11:00:00Z', '2026-08-31T11:05:00Z', now)).toMatchObject({ durationMs: 300_000, state: 'completed' });
    expect(deriveDuration('2026-08-31T11:00:00Z', null, now)).toMatchObject({ durationMs: 3_600_000, state: 'live' });
    expect(deriveDuration(null, null, now).state).toBe('unavailable');
  });

  it('builds nine weekly hold-rate points without treating missing rows as zero', () => {
    const points = buildHoldRateTimeseries([
      { created_at: '2026-08-31T09:00:00Z', total_rows: 100, failed_rows: 5 },
      { created_at: '2026-08-24T09:00:00Z', total_rows: 50, failed_rows: 2 },
    ], now);
    expect(points).toHaveLength(9);
    expect(points.at(-1)).toMatchObject({ heldRows: 5, totalRows: 100, percentage: 5, state: 'available' });
    expect(points[0]).toMatchObject({ heldRows: null, totalRows: null, percentage: null, state: 'unavailable' });
  });

  it('prioritises failed source observations and emits unknown days', () => {
    const cells = buildSourceUptimeCells([
      { created_at: '2026-08-31T09:00:00Z', status: 'completed', last_error_code: null },
      { created_at: '2026-08-31T10:00:00Z', status: 'partial', last_error_code: null },
      { created_at: '2026-08-30T10:00:00Z', status: 'failed', last_error_code: 'timeout' },
    ], now);
    expect(cells.at(-1)).toMatchObject({ state: 'degraded', observedRuns: 2 });
    expect(cells.at(-2)).toMatchObject({ state: 'failed' });
    expect(cells[0].state).toBe('unknown');
    expect(cells).toHaveLength(28);
  });

  it('derives ageing from the last recorded stage event', () => {
    expect(deriveRecoveryAgeing({
      createdAt: '2026-08-20T12:00:00Z',
      status: 'waiting_response',
      deadlineAt: '2026-09-05T12:00:00Z',
      events: [
        { to_status: 'submitted', created_at: '2026-08-21T12:00:00Z' },
        { to_status: 'waiting_response', created_at: '2026-08-25T12:00:00Z' },
      ],
      now,
    })).toMatchObject({ stageSince: '2026-08-25T12:00:00Z', daysInStage: 6, partnerWindowDays: 11, remainingDays: 5, state: 'available' });
  });

  it('keeps line margin unavailable when source cost is absent', () => {
    expect(deriveLineItemMargin({ totalMinor: 10_000, costMinor: 4_000, currency: 'gbp' })).toMatchObject({ marginMinor: 6_000, marginRatePercent: 60, currency: 'GBP', state: 'available' });
    expect(deriveLineItemMargin({ totalMinor: 10_000, costMinor: null, currency: 'GBP' }).state).toBe('unavailable');
  });

  it('groups custody scans and marks only source-backed legs witnessed', () => {
    const legs = deriveCustodyLegs([
      { id: 'a', locationText: 'Hub A', sourceStatus: 'in_transit', sourceEventAt: '2026-08-20T10:00:00Z', sourceRecordId: 'sr-a' },
      { id: 'b', locationText: 'Hub A', sourceStatus: 'in_transit', sourceEventAt: '2026-08-21T10:00:00Z', sourceRecordId: 'sr-b' },
      { id: 'c', locationText: 'Hub B', sourceStatus: 'in_transit', sourceEventAt: '2026-08-22T10:00:00Z', sourceRecordId: 'sr-c' },
    ]);
    expect(legs).toHaveLength(2);
    expect(legs[0]).toMatchObject({ location: 'Hub A', witnessed: true, evidenceEventIds: ['a', 'b'] });
    expect(legs[1]).toMatchObject({ location: 'Hub B', witnessed: true });
  });

  it('stops response timing at the last observed ticket message', () => {
    const summary = deriveTicketResponseTimes([
      { kind: 'message', actor: 'customer', at: '2026-08-31T10:00:00Z' },
      { kind: 'message', actor: 'agent', at: '2026-08-31T10:30:00Z' },
      { kind: 'message', actor: 'customer', at: '2026-08-31T11:00:00Z' },
    ]);
    expect(summary).toMatchObject({ medianMs: 1_800_000, latestObservedAt: '2026-08-31T11:00:00Z', stopsAtLastObserved: true, state: 'available' });
    expect(summary.responses).toHaveLength(1);
  });

  it('does not manufacture a dispute deadline or partner statistics', () => {
    expect(deriveDisputeCountdown({ initiatedAt: '2026-08-01T00:00:00Z', deadlineAt: null, now }).state).toBe('unavailable');
    expect(derivePartnerStatistics([])).toMatchObject({ sampleSize: 0, payRatePercent: null, medianDays: null, state: 'unavailable' });
  });

  it('requires two observations before projecting credit exhaustion', () => {
    const unavailable = deriveCreditBurnForecast([{ occurred_at: '2026-08-30T12:00:00Z', credits_spent: 10, status: 'succeeded' }], 90, now);
    expect(unavailable.state).toBe('unavailable');
    const available = deriveCreditBurnForecast([
      { occurred_at: '2026-08-01T12:00:00Z', credits_spent: 10, status: 'succeeded' },
      { occurred_at: '2026-08-11T12:00:00Z', credits_spent: 20, status: 'succeeded' },
    ], 90, now);
    expect(available).toMatchObject({ creditsObserved: 30, dailyRate: 3, state: 'available' });
    expect(available.projectedExhaustionAt).toBeTruthy();
  });

  it('keeps currency restatement explicit and preview-only', () => {
    expect(buildRestatementPreview({ baseMinor: 10_000, baseCurrency: 'GBP', proposedCurrency: 'EUR', rate: 1.17, rateDate: '2026-08-31' })).toMatchObject({ proposedMinor: 11_700, state: 'available' });
    expect(buildRestatementPreview({ baseMinor: 10_000, baseCurrency: 'GBP', proposedCurrency: 'EUR', rate: null, rateDate: null }).state).toBe('unavailable');
  });

  it('labels actor activity as recorded financial action without claiming money movement', () => {
    expect(buildActorActionSummary([
      { actor_user_id: 'u1', action: 'record_decision' },
      { actor_user_id: 'u1', action: 'record_decision' },
    ])).toEqual([{ actorUserId: 'u1', action: 'record_decision', count: 2, financialRecordAction: true, movedMoney: false }]);
  });

  it('renders a digest preview without enabling delivery', () => {
    const preview = renderDigestPreview([{ id: '00000000-0000-0000-0000-000000000001', kind: 'sync_failure', title: 'Shopify sync failed', body: 'Three rows held', target_href: '/sources/shopify', read_at: null, created_at: '2026-08-31T10:00:00Z' }], now);
    expect(preview).toMatchObject({ deliveryEnabled: false, notificationCount: 1, unreadCount: 1 });
    expect(preview.items).toEqual([expect.objectContaining({
      href: '/sources/shopify', title: 'Shopify sync failed', body: 'Three rows held',
    })]);
    expect(preview.bodyText).toContain('Shopify sync failed — Three rows held');
  });
});
