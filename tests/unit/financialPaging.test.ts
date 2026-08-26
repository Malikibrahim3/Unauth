import type { SupabaseClient } from '@supabase/supabase-js';
import { listReconciliationPage } from '@/lib/exceptions/store';
import { listRecoveryCasesPage } from '@/lib/recoveries/store';

describe('MR4 financial paging contracts', () => {
  it('keeps reconciliation exception 101 reachable with stable totals', async () => {
    const rpc = jest.fn(async () => ({ data: {
      rows: [{ id: 'exception-101', title: 'Exception 101', created_at: '2026-08-01T00:00:00Z' }],
      page: 5, page_size: 25, total_count: 101, total_pages: 5,
    }, error: null }));
    const result = await listReconciliationPage({ rpc } as unknown as SupabaseClient, 'merchant-1', { page: 5, pageSize: 25 });
    expect(result.rows[0]?.id).toBe('exception-101');
    expect(result.totalCount).toBe(101);
    expect(result.totalPages).toBe(5);
    expect(result.stableOrder).toBe('created_at_desc_id_desc');
  });

  it('returns every recovery page instead of a display-card sample', async () => {
    const rpc = jest.fn(async () => ({ data: {
      rows: [{ id: 'recovery-51', status: 'submitted', currency: 'GBP', merchant_loss_amount: 10, amount_recovered: 0 }],
      page: 3, page_size: 25, total_count: 51, total_pages: 3,
      stage_counts: { filed: 51 }, currencies: ['GBP'],
    }, error: null }));
    const result = await listRecoveryCasesPage({ rpc } as unknown as SupabaseClient, 'merchant-1', { stage: 'filed', page: 3 });
    expect(result.rows[0]?.id).toBe('recovery-51');
    expect(result.totalCount).toBe(51);
    expect(result.source).toBe('canonical');
    expect(result.stableOrder).toBe('updated_at_desc_id_desc');
  });
});
