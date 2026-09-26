import fs from 'node:fs';
import path from 'node:path';

const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260906170000_merchant_clarity_p05_manual_replacement.sql'),
  'utf8',
);
const corroborationRepair = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260906173000_merchant_clarity_p05_replacement_corroboration_repair.sql'),
  'utf8',
);
const sourceIdentityRepair = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260906174000_merchant_clarity_p05_replacement_source_identity_repair.sql'),
  'utf8',
);

describe('merchant clarity P05 migration', () => {
  it('keeps exact authorisation items and source corroborations append-only and tenant scoped', () => {
    expect(sql).toContain('case_replacement_authorisation_items');
    expect(sql).toContain('case_replacement_corroborations');
    expect(sql).toMatch(/unique \(merchant_id, case_decision_id, case_claimed_item_id\)/i);
    expect(sql).toMatch(/unique \(merchant_id, source_replacement_id\)/i);
    expect(sql).toMatch(/for each row execute function public\.forbid_phase7_history_mutation\(\)/i);
    expect(sql).toMatch(/using \(public\.is_merchant_member\(merchant_id\)\)/i);
    expect(sql).toMatch(/revoke all on public\.case_replacement_authorisation_items from public, anon, authenticated/i);
  });

  it('locks case and original lines and checks quantity, identity, currency, budget, and prior concessions', () => {
    expect(sql).toMatch(/from public\.support_payout_cases[\s\S]*for update/i);
    expect(sql).toMatch(/from public\.source_order_lines[\s\S]*for update/i);
    expect(sql).toContain('replacement_item_ids_must_be_unique');
    expect(sql).toContain('replacement_quantity_exceeds_available');
    expect(sql).toContain('replacement_same_item_identity_invalid');
    expect(sql).toContain('replacement_currency_must_match_order');
    expect(sql).toContain('replacement_budget_required');
    expect(sql).toContain('replacement_duplicate_concession_justification_required');
    expect(sql).toContain("action_row.action_state in ('source_observed_attempt', 'provider_accepted', 'provider_processing', 'succeeded', 'reconciled')");
  });

  it('records only a manual replacement handoff and requires evidence before merchant dispatch', () => {
    expect(sql).toContain("'replacement.manual_handoff'");
    expect(sql).not.toContain("'refund.manual_handoff'");
    expect(sql).toContain("'external_action_performed', false");
    expect(sql).toContain('replacement_dispatch_receipt_required');
    expect(sql).toContain('report_replacement_dispatch_v1');
    expect(sql).toContain('corroborate_replacement_handoff_v1');
    expect(sql).toContain('source_replacement_handoff_projection');
    expect(sql).toContain('record_replacement_cost_v1');
    expect(sql).toMatch(/'replacement_actual_cost'/i);
    const corroborationFunction = sql.split('create or replace function public.corroborate_replacement_handoff_v1')[1]
      .split('create or replace function public.project_source_replacement_handoff_v1')[0];
    expect(corroborationFunction).not.toMatch(/insert into public\.case_financial_entries/i);
  });

  it('preserves legacy approval semantics while storing an explicit replacement action', () => {
    expect(sql).toMatch(/'approved',\s*'same_item_replacement'/i);
    expect(sql).toContain("v_existing_decision.action is distinct from 'same_item_replacement'");
  });

  it('does not attach a source observation to a cancelled pre-dispatch or wrong-case authorisation', () => {
    expect(corroborationRepair).toContain('reversal.reverses_decision_id = decision_row.id');
    expect(corroborationRepair).toContain('action_row.merchant_reported_at is not null');
    expect(sourceIdentityRepair).toContain('authorised.support_payout_case_id = v_source.support_payout_case_id');
    expect(sourceIdentityRepair).toContain('action_row.external_reference = v_source.external_id');
    expect(sourceIdentityRepair).toMatch(/for update of authorised/i);
  });
});
