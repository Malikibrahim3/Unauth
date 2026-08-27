import JSZip from 'jszip';
import { buildClaimPack, renderClaimPackPdf, renderClaimPackZip } from '@/lib/recoveries/claimPack';
import { evaluateProviderClaimReadiness } from '@/lib/recoveries/claimReadiness';

jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: jest.fn(async () => Buffer.from('%PDF-1.7\nclaim-pack-test')),
  Document: 'Document',
  Page: 'Page',
  Text: 'Text',
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
}));

const readiness = (state: 'ready' | 'missing') => evaluateProviderClaimReadiness({
  now: '2026-08-22T12:00:00.000Z',
  ruleVersionId: '11111111-1111-4111-8111-111111111111',
  ruleConfirmed: true,
  claimantAuthority: { present: true },
  shipmentIdentity: { present: true },
  custodyEstablished: { present: true },
  coveredEvent: { present: true },
  deadlineOpen: { present: true },
  issueEvidence: { present: true },
  valueSubstantiated: { present: state === 'ready' },
  amountBounded: { present: state === 'ready' },
  exclusionsAndPreservation: { present: true },
});

const sources = [
  {
    id: 'evidence-helpdesk', sourceClass: 'helpdesk' as const, system: 'gorgias', sourceRecordId: 'ticket-1', originalUrl: 'https://example.test/ticket-1', storagePath: null,
    eventAt: '2026-08-20T12:00:00.000Z', sourceCreatedAt: '2026-08-20T12:00:00.000Z', sourceUpdatedAt: null, ingestedAt: '2026-08-20T12:01:00.000Z', freshness: 'fresh', factKind: 'source_fact' as const, evidenceType: 'customer_statement', summary: 'Customer reports non-receipt.', contentHash: 'abc', lineageRootId: 'evidence-helpdesk', supports: [], conflicts: [],
  },
  {
    id: 'evidence-history', sourceClass: 'customer_history' as const, system: 'crm', sourceRecordId: 'history-1', originalUrl: null, storagePath: null,
    eventAt: '2026-08-01T12:00:00.000Z', sourceCreatedAt: null, sourceUpdatedAt: null, ingestedAt: '2026-08-01T12:01:00.000Z', freshness: 'fresh', factKind: 'source_fact' as const, evidenceType: 'prior_contact', summary: 'Historical context.', contentHash: null, lineageRootId: 'evidence-history', supports: [], conflicts: [],
  },
];

describe('provider claim pack', () => {
  it('watermarks incomplete packs and excludes customer history from the manifest', () => {
    const build = buildClaimPack({
      recoveryCaseId: 'recovery-1', supportPayoutCaseId: 'case-1', partnerName: 'Northline Courier', providerType: 'carrier', currency: 'GBP', amountSoughtMinor: 12500,
      readiness: readiness('missing'), ruleVersionId: 'rule-1', issueSummary: 'Missing parcel', chronology: [], sources, generatedAt: '2026-08-22T12:00:00.000Z', forceDraft: true,
    });
    expect(build.state).toBe('draft');
    expect(build.manifest.draftWatermark).toBe(true);
    expect(build.manifest.allowedSources.map((source) => source.id)).toEqual(['evidence-helpdesk']);
    expect(build.manifest.excludedSources[0]?.reason).toContain('Customer history');
    expect(build.manifestHash).toHaveLength(64);
  });

  it('freezes a final manifest only when readiness is ready_to_submit and the zip contains a machine manifest', async () => {
    const build = buildClaimPack({
      recoveryCaseId: 'recovery-1', supportPayoutCaseId: 'case-1', partnerName: 'Northline Courier', providerType: 'carrier', currency: 'GBP', amountSoughtMinor: 12500,
      readiness: readiness('ready'), ruleVersionId: 'rule-1', issueSummary: 'Missing parcel', chronology: [{ stage: 'Courier transit', occurredAt: '2026-08-20T12:00:00.000Z', summary: 'Loss scan', evidenceIds: ['evidence-helpdesk'] }], sources, generatedAt: '2026-08-22T12:00:00.000Z',
    });
    expect(build.state).toBe('final');
    expect(build.manifest.draftWatermark).toBe(false);
    const zip = await renderClaimPackZip(build, Buffer.from('pdf'));
    const loaded = await JSZip.loadAsync(zip);
    expect(await loaded.file('manifest.json')?.async('string')).toContain('claim-pack-v1');
    expect(await loaded.file('checklist.txt')?.async('string')).toContain('claimant_authority');
  });

  it('passes the draft manifest through the PDF renderer and emits an artifact', async () => {
    const build = buildClaimPack({
      recoveryCaseId: 'recovery-1', supportPayoutCaseId: 'case-1', partnerName: 'Northline Courier', providerType: 'carrier', currency: 'GBP', amountSoughtMinor: 12500,
      readiness: readiness('missing'), ruleVersionId: 'rule-1', issueSummary: 'Missing parcel', chronology: [], sources, generatedAt: '2026-08-22T12:00:00.000Z', forceDraft: true,
    });
    const pdf = await renderClaimPackPdf(build);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(10);
  });
});
