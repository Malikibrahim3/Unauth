import { deriveRecordSectionCoverage } from '@/lib/relationships/objectSummary';

const provenance = {
  sourceSystem: 'shopify', externalId: 'order-1', sourceUrl: 'https://example.test/order-1',
  freshness: 'current', syncState: 'synced', lastSyncedAt: '2026-09-06T10:00:00.000Z',
  sourceCreatedAt: null, sourceUpdatedAt: null, connectorVersion: null, payloadHash: null,
};

describe('deriveRecordSectionCoverage', () => {
  it.each([
    [{ supported: false, retainedCount: 0, provenance, label: 'Messages' }, 'unsupported'],
    [{ supported: true, retainedCount: 0, provenance: null, label: 'Messages' }, 'not_imported'],
    [{ supported: true, retainedCount: 0, sourceCount: 0, provenance, label: 'Messages' }, 'verified_empty'],
    [{ supported: true, retainedCount: 2, sourceCount: 4, provenance, label: 'Messages' }, 'not_retained'],
    [{ supported: true, retainedCount: 4, sourceCount: 4, provenance, label: 'Messages' }, 'retained'],
  ])('keeps section state %s distinct', (input, state) => {
    expect(deriveRecordSectionCoverage(input)).toMatchObject({ state });
  });

  it('uses the retained count and provides repair only where useful', () => {
    const partial = deriveRecordSectionCoverage({ supported: true, retainedCount: 2, sourceCount: 4, provenance, label: 'Line items' });
    expect(partial).toMatchObject({ retainedCount: 2, sourceCount: 4, repairHref: '/sources/connected' });
    expect(partial.explanation).toContain('only 2');
  });
});
