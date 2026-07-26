import fs from 'node:fs';
import path from 'node:path';

describe('Gorgias widget GET is read-only', () => {
  it('uses the non-mutating decision preview path', () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), 'app/api/gorgias/widget/route.ts'),
      'utf8',
    );
    expect(route).toContain('previewClaimDecision');
    expect(route).not.toContain('evaluateClaimDecision');
  });

  it('keeps persistence and evidence sync out of previewClaimDecision', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'lib/claims/decision/evaluate.ts'),
      'utf8',
    );
    const preview = source.slice(
      source.indexOf('export async function previewClaimDecision'),
      source.indexOf('export async function evaluateClaimDecision'),
    );
    expect(preview).toContain('computeClaimDecision');
    expect(preview).not.toContain('persistSupportPayoutCaseDecision');
    expect(preview).not.toContain('ensureClaimDecisionEvidence');
    expect(preview).not.toContain('writeClaimRuleEvaluationAudit');
  });
});
