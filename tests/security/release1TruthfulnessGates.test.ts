import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Release 1 truthfulness gates', () => {
  it.each([
    'app/api/claim-gate/check/route.ts',
    'app/api/v1/gate/evaluate/route.ts',
    'app/api/v1/gate/escalation/route.ts',
  ])('authenticates and gates the non-canonical public writer in %s', (file) => {
    const source = read(file);
    const handler = source.slice(source.indexOf('export async function POST'));
    expect(source).toContain('validateApiKey');
    expect(source).toContain('isPublicClaimGateEnabled');
    expect(handler.indexOf('validateApiKey')).toBeLessThan(
      handler.indexOf('isPublicClaimGateEnabled()'),
    );
    expect(source).toContain('status: 503');
  });

  it('does not auto-run the public gate during Gorgias intake by default', () => {
    const source = read('app/api/gorgias/support-webhook/route.ts');
    expect(source).toContain('isPublicClaimGateEnabled()');
    expect(source.indexOf('isPublicClaimGateEnabled()')).toBeLessThan(
      source.indexOf('await evaluatePublicGate'),
    );
  });

  it('gates generic ingestion, flow publication, activation, and execution', () => {
    expect(read('app/api/v1/ingest/events/route.ts')).toContain(
      "env.GENERIC_EVENT_INGESTION_ENABLED !== 'true'",
    );
    expect(read('app/api/workflows/[id]/publish/route.ts')).toContain(
      "env.WORKFLOW_PUBLICATION_ENABLED === 'true'",
    );
    expect(read('app/api/workflows/[id]/state/route.ts')).toContain(
      "env.WORKFLOW_PUBLICATION_ENABLED !== 'true'",
    );
    expect(read('lib/events/handlers/workflowHandler.ts')).toContain(
      'workflows:publication_gated',
    );
  });

  it('keeps investigation writes and external email behind independent kill switches', () => {
    const environment = read('lib/utils/env.ts');
    const authorization = read('lib/investigations/routeAuth.ts');
    expect(environment).toContain('INVESTIGATIONS_ENABLED');
    expect(environment).toContain('INVESTIGATION_EMAIL_DISPATCH_ENABLED');
    expect(authorization).toContain('options.requireWriteFeature');
    expect(authorization).toContain('areInvestigationWritesEnabled()');

    for (const file of [
      'app/api/claims/[claimId]/investigations/route.ts',
      'app/api/claims/[claimId]/investigations/[investigationId]/route.ts',
      'app/api/claims/[claimId]/investigations/[investigationId]/attachments/route.ts',
      'app/api/claims/[claimId]/investigations/[investigationId]/cancel/route.ts',
      'app/api/claims/[claimId]/investigations/[investigationId]/chase/route.ts',
      'app/api/claims/[claimId]/investigations/[investigationId]/close/route.ts',
      'app/api/claims/[claimId]/investigations/[investigationId]/mark-sent/route.ts',
      'app/api/claims/[claimId]/investigations/[investigationId]/response/route.ts',
      'app/api/claims/[claimId]/investigations/[investigationId]/send/route.ts',
    ]) {
      expect(read(file)).toContain('{ requireWriteFeature: true }');
    }

    expect(
      read('app/api/claims/[claimId]/investigations/[investigationId]/send/route.ts'),
    ).toContain('isInvestigationEmailDispatchEnabled()');
  });
});
