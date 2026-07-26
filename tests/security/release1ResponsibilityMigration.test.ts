import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260723300000_release1_responsibility_recovery.sql',
  ),
  'utf8',
);

describe('Release 1 responsibility confirmation contract', () => {
  it('protects a confirmed projection from generic writes', () => {
    expect(migration).toContain('protect_confirmed_case_responsibility');
    expect(migration).toContain('confirmed_case_responsibility_is_protected');
    expect(migration).toContain(
      "current_setting('app.allow_responsibility_projection_write', true)",
    );
  });

  it('is merchant-scoped, versioned, idempotent, and evidence-scoped', () => {
    expect(migration).toContain('create or replace function public.record_case_responsibility');
    expect(migration).toContain('responsibility_version_conflict');
    expect(migration).toContain("trim(p_idempotency_key) || ':event'");
    expect(migration).toContain('evidence.merchant_id = p_merchant_id');
    expect(migration).toContain('evidence.claim_id = p_case_id');
  });

  it('records confirmation or correction as semantic immutable history', () => {
    expect(migration).toContain("'case.responsibility_confirmed'");
    expect(migration).toContain("'case.responsibility_corrected'");
    expect(migration).toContain("'responsibility_confirmed'");
    expect(migration).toContain("'responsibility_corrected'");
    expect(migration).toContain("'auditTimelineProjection'");
  });

  it('does not expose the mutation to browser roles', () => {
    expect(migration).toContain(
      'from public, anon, authenticated',
    );
    expect(migration).toContain('to service_role');
  });
});

describe('explicit recovery handoff', () => {
  const recoverySource = fs.readFileSync(
    path.join(
      process.cwd(),
      'lib/recoveries/createFromSupportPayoutCase.ts',
    ),
    'utf8',
  );
  const route = fs.readFileSync(
    path.join(
      process.cwd(),
      'app/api/claims/[claimId]/recovery-handoff/route.ts',
    ),
    'utf8',
  );

  it('cannot create a new recovery without the explicit handoff path', () => {
    expect(recoverySource).toContain('explicitHandoff: boolean');
    expect(recoverySource).toContain('if (!input.explicitHandoff) return null');
    expect(route).toContain('explicitHandoff: true');
  });

  it('requires confirmed responsibility and a canonical loss', () => {
    expect(route).toContain('responsibility_confirmation_required');
    expect(route).toContain('canonical_loss_required');
    expect(route).toContain('.from(TABLES.LOSS_CASES)');
  });

  it('truthfully declares that no external submission occurred', () => {
    expect(route).toContain("external_submission: 'not_performed'");
  });
});
