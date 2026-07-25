import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260725100000_evidence_reconciliation_pivot.sql'),
  'utf8',
);

describe('evidence reconciliation migration', () => {
  it('creates the item, parcel, recommendation, outcome, and credit records', () => {
    for (const table of [
      'case_claimed_items',
      'source_shipment_lines',
      'case_recommendation_snapshots',
      'case_outcome_events',
      'provider_credit_records',
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
    expect(migration).toContain('idx_case_claimed_items_case_order_line');
    expect(migration).toContain('recommendation_type in (\'customer_action\', \'responsibility\', \'recovery\')');
    expect(migration).toContain('add column if not exists source_shipment_line_id uuid references public.source_shipment_lines');
  });

  it('keeps recommendation and outcome history append-only and service-written', () => {
    expect(migration).toContain('protect_reconciliation_snapshot_history');
    expect(migration).toContain('protect_case_outcome_history');
    expect(migration).toContain('revoke insert, update, delete on public.case_recommendation_snapshots from anon, authenticated');
    expect(migration).toContain('revoke insert, update, delete on public.case_outcome_events from anon, authenticated');
    expect(migration).toContain('purge_merchant_reconciliation_history');
  });

  it('models settlement stages separately from recovery approval', () => {
    expect(migration).toContain('provider_claim_stage');
    expect(migration).toContain("'credited', 'reconciled', 'closed_unrecoverable'");
  });
});
