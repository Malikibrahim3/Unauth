import { claimNarrative } from '@/lib/recoveries/claimNarrative';
import type { CaseEvidenceFile } from '@/lib/claims/caseEvidenceFile';
const file = { claim: { issueSummary: 'Customer reports non-delivery' }, evidence: [], custodyChain: [{ label: 'Carrier transit', state: 'missing', occurredAt: null, evidenceIds: [], summary: 'No tracking retained' }], recoveryCase: null, providerClaimReadiness: { gates: [{ headline: 'Shipment identity', state: 'missing', nextAction: 'Attach a tracking source' }] } } as unknown as CaseEvidenceFile;
it('turns absent custody and value into missing inputs without asserting an event', () => {
  const narrative = claimNarrative(file);
  expect(narrative).toContain('Reported issue:');
  expect(narrative).toContain('Attach a tracking source');
  expect(narrative).not.toContain('Carrier transit');
  expect(narrative).not.toContain('was last observed');
  expect(narrative).not.toContain('Customer evidence was recorded');
});
it('includes only met custody events backed by permitted source facts', () => {
  const complete = { ...file, evidence: [{ id: 'source', allowedInProviderPack: true, factKind: 'source_fact' }], custodyChain: [{ label: 'Carrier transit', state: 'met', occurredAt: '2026-09-01T12:00:00Z', evidenceIds: ['source'], summary: 'Carrier acceptance recorded' }], recoveryCase: { currency: 'GBP', amount_sought_minor: 1200 }, providerClaimReadiness: { gates: [] } } as unknown as CaseEvidenceFile;
  expect(claimNarrative(complete)).toContain('Carrier acceptance recorded [source]');
  expect(claimNarrative(complete)).toContain('£12.00');
  expect(claimNarrative({ ...complete, evidence: [{ ...complete.evidence[0], factKind: 'inference' }] })).not.toContain('Carrier acceptance recorded');
});
