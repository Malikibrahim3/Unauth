import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260823130000_mr3_work_and_external_actions.sql'),
  'utf8',
);

describe('MR3 Work and external-action migration', () => {
  it('owns one exact combined queue projection with deterministic tie-breakers', () => {
    expect(migration).toContain('create or replace function public.work_queue_page_v1');
    expect(migration).toContain("'task'::text as kind");
    expect(migration).toContain("'exception'::text as kind");
    expect(migration).toContain('count(*) over () as exact_total');
    expect(migration).toContain('scoped.kind asc');
    expect(migration).toContain('scoped.id asc');
  });

  it('makes task actions optimistic, idempotent, tenant-scoped and audited', () => {
    expect(migration).toContain('create or replace function public.transition_work_task_v1');
    expect(migration).toContain('v_task.state_version is distinct from p_expected_version');
    expect(migration).toContain('where merchant_id = p_merchant_id and id = p_task_id');
    expect(migration).toContain("'work_task.' || p_action");
    expect(migration).toContain('revoke all on function public.bulk_transition_work_tasks');
  });

  it('separates merchant report, source observation, provider success and reconciliation', () => {
    expect(migration).toContain("'merchant_reported_attempt'");
    expect(migration).toContain("'source_observed_attempt'");
    expect(migration).toContain("'provider_accepted'");
    expect(migration).toContain("'provider_processing'");
    expect(migration).toContain("'succeeded'");
    expect(migration).toContain("'reconciled'");
    expect(migration).toContain("p_authority = 'merchant' and p_target_state <> 'merchant_reported_attempt'");
  });
});
