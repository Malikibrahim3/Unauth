import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('tenant authorization hardening contract', () => {
  const migration = read('supabase/migrations/20260722100000_tenant_authorization_hardening.sql');

  it('removes implicit client execution of privileged public RPCs', () => {
    expect(migration).toContain(
      'revoke all on function %s from public, anon, authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.is_merchant_member(uuid) to authenticated',
    );
    expect(migration).toContain(
      'grant execute on function public.merchant_role(uuid) to authenticated',
    );
  });

  it('reserves sensitive business writes for permission-checked server routes', () => {
    for (const table of [
      'case_clarification_requests', 'case_decisions', 'case_outcomes',
      'evidence_links', 'evidence_packages', 'identity_notes',
      'loss_attribution_candidates', 'merchant_identity_state', 'merchant_rules',
      'partner_recovery_rules', 'partners', 'recovery_cases',
      'support_payout_cases', 'work_tasks',
    ]) {
      expect(migration).toContain(
        `revoke insert, update, delete on public.${table} from anon, authenticated`,
      );
    }
  });

  it('requires an explicit active workspace for ambiguous or forged selection', () => {
    const permissions = read('lib/permissions/index.ts');
    expect(permissions).toContain('return selected ? toCtx(selected) : null');
    expect(permissions).toContain('return active.length === 1 ? toCtx(active[0]) : null');
    expect(permissions).not.toContain('ROLE_RANK');
  });

  it('scopes report export, evidence download, job status, and object deep links', () => {
    const report = read('app/api/reports/claims/route.ts');
    expect(report).toContain('permission.ctx.merchantId');
    expect(report).toContain('PERMISSIONS.EXPORT_AUDIT');

    const evidence = read('app/api/evidence/[id]/pdf/route.ts');
    expect(evidence).toContain('createScopedClient(ctx.merchantId');
    expect(evidence).toContain('.eq(\'id\', id)');

    const job = read('app/api/imports/[jobId]/route.ts');
    expect(job).toContain('createScopedClient(ctx.merchantId');
    expect(job).toContain('.eq(\'id\', jobId)');

    const object = read('app/api/objects/[type]/[id]/route.ts');
    expect(object).toContain('getObjectSummary(svc as any, ctx.merchantId, type, id)');
  });
});
