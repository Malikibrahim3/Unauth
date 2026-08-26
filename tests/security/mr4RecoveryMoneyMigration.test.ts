import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260823160000_mr4_recovery_money_truth.sql'),
  'utf8',
);

describe('MR4 recovery and money truth migration', () => {
  it('makes provider-credit history immutable and service-written', () => {
    expect(migration).toContain('create table if not exists public.provider_credit_events');
    expect(migration).toContain('create trigger trg_provider_credit_events_immutable');
    expect(migration).toContain('provider_credit_events_are_append_only');
    expect(migration).toContain('revoke insert, update, delete, truncate on public.provider_credit_events from public, anon, authenticated');
  });

  it('prevents manual received-money projection and separates match from reconciliation', () => {
    expect(migration).toContain('recovery_received_requires_source_credit_match');
    expect(migration).toContain("p_action not in ('candidate', 'matched', 'dismissed', 'reconciled')");
    expect(migration).toContain("reconciliation_status = 'received_unreconciled'");
    expect(migration).toContain("reconciliation_status = 'reconciled'");
    expect(migration).toContain('provider_credit_exceeds_recovery_bound');
    expect(migration).toContain("set_config('app.mr4_credit_projection', 'off', true)");
  });

  it('keeps corrections append-only and currencies bounded', () => {
    expect(migration).toContain('p_reverses_credit_id');
    expect(migration).toContain('reverses_entry_id');
    expect(migration).toContain('provider_credit_currency_mismatch');
    expect(migration).toContain('provider_credit_reversal_invalid');
  });

  it('provides exact unbounded paging and one canonical aggregate contract', () => {
    expect(migration).toContain('function public.recovery_page_v1');
    expect(migration).toContain('function public.reconciliation_page_v1');
    expect(migration).toContain('function public.financial_aggregate_v1');
    expect(migration).toContain("'mixed_currency_policy', 'separated'");
    expect(migration).toContain("'unknown_policy', 'withheld_not_zero'");
  });

  it('exposes mutation functions to service role only', () => {
    expect(migration).toContain('grant execute on function public.record_provider_credit_v1');
    expect(migration).toContain('grant execute on function public.transition_provider_credit_v1');
    expect(migration).not.toContain('grant execute on function public.transition_provider_credit_v1(uuid,uuid,uuid,text,integer,text,numeric,uuid,text,text) to authenticated');
  });
});
