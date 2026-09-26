import { loadFinancialPeriodPreview } from '@/lib/reconciliation/periodReadModel';

const bounds = {
  start: new Date('2026-07-01T23:00:00.000Z'),
  end: new Date('2026-07-31T23:00:00.000Z'),
};

describe('financial period preview', () => {
  it('preserves receipt stages and blocks close when the exact blocker population is capped', async () => {
    const client = {
      rpc: jest.fn().mockResolvedValue({
        data: {
          blockers: [{ id: 'blocker-1', title: 'Receipt needs review', assigned_to: null, created_at: '2026-07-12T10:00:00.000Z' }],
          blocker_count: 501,
          blockers_complete: false,
          earlier_outstanding_count: 7,
          settlements: [{
            currency: 'gbp', record_count: 4, received_minor: 35_608_07,
            matched_minor: 16_358_55, received_unreconciled_minor: 2_000_00,
            reconciled_minor: 14_358_55,
          }],
        },
        error: null,
      }),
    };

    const preview = await loadFinancialPeriodPreview(client as never, 'merchant-1', bounds);

    expect(preview.source).toBe('canonical');
    expect(preview.blockersState).toBe('partial');
    expect(preview.earlierOutstandingCount).toBe(7);
    expect(preview.settlements).toEqual([{
      currency: 'GBP', recordCount: 4, receivedMinor: 35_608_07,
      matchedMinor: 16_358_55, receivedUnreconciledMinor: 2_000_00,
      reconciledMinor: 14_358_55,
    }]);
    expect(preview.closeBlockedReasons).toContain(
      'The current period has more than 500 open blockers; acknowledge them from an uncapped review before closing.',
    );
  });

  it('distinguishes a complete empty settlement snapshot from an unavailable one', async () => {
    const completeClient = {
      rpc: jest.fn().mockResolvedValue({
        data: {
          blockers: [], blocker_count: 0, blockers_complete: true,
          earlier_outstanding_count: 0, settlements: [],
        },
        error: null,
      }),
    };
    const unavailableClient = {
      rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } }),
    };

    const complete = await loadFinancialPeriodPreview(completeClient as never, 'merchant-1', bounds);
    const unavailable = await loadFinancialPeriodPreview(unavailableClient as never, 'merchant-1', bounds);

    expect(complete.settlementState).toBe('verified_empty');
    expect(complete.closeBlockedReasons).toEqual([]);
    expect(unavailable.settlementState).toBe('unavailable');
    expect(unavailable.closeBlockedReasons).toContain('The source/receipt-backed settlement snapshot is unavailable.');
  });
});
