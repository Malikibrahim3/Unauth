import { createMemoryClient, rowsOf } from '@/tests/lib/supabaseMemoryClient';
import { recordCandidates } from '@/lib/relationships/candidateStore';
import { resolveMatch } from '@/lib/relationships/resolveMatch';
import { TABLES } from '@/lib/supabase/tables';

const MERCHANT = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

async function seedAmbiguousCase() {
  const client = createMemoryClient();
  const rows = await recordCandidates(client as never, {
    merchantId: MERCHANT,
    subjectEntityType: 'case',
    subjectEntityId: 'case-1',
    candidates: [
      { entityType: 'order', entityId: 'o1', method: 'email' },
      { entityType: 'order', entityId: 'o2', method: 'email' },
    ],
  });
  return { client, rows };
}

describe('resolveMatch', () => {
  it('selecting a candidate confirms the relationship and rejects the rest', async () => {
    const { client, rows } = await seedAmbiguousCase();
    const chosen = rows.find((r) => r.candidate_entity_id === 'o1')!;

    const result = await resolveMatch(client as never, {
      merchantId: MERCHANT,
      subjectEntityType: 'case',
      subjectEntityId: 'case-1',
      selectedCandidateId: chosen.id,
      reason: 'agent picked correct order',
      resolvedBy: USER,
    });

    expect(result.status).toBe('confirmed');
    expect(result.relationshipId).toBeTruthy();

    const edges = rowsOf(client, TABLES.ENTITY_RELATIONSHIPS);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ to_entity_id: 'o1', match_status: 'confirmed', match_method: 'manual' });

    const candidates = rowsOf(client, TABLES.RECORD_MATCH_CANDIDATES);
    expect(candidates.find((c) => c.id === chosen.id)?.status).toBe('selected');
    expect(candidates.filter((c) => c.status === 'rejected')).toHaveLength(1);

    const resolutions = rowsOf(client, TABLES.RECORD_MATCH_RESOLUTIONS);
    expect(resolutions).toHaveLength(1);
    expect(resolutions[0]).toMatchObject({ prior_status: 'ambiguous', new_status: 'confirmed', resolved_by: USER });

    expect(rowsOf(client, 'domain_events').some((e) => e.event_type === 'relationship.resolved')).toBe(true);
  });

  it('resolving with no selection leaves the subject unmatched and rejects all', async () => {
    const { client } = await seedAmbiguousCase();
    const result = await resolveMatch(client as never, {
      merchantId: MERCHANT,
      subjectEntityType: 'case',
      subjectEntityId: 'case-1',
      selectedCandidateId: null,
      resolvedBy: USER,
    });

    expect(result.status).toBe('unmatched');
    expect(result.relationshipId).toBeNull();
    expect(rowsOf(client, TABLES.ENTITY_RELATIONSHIPS)).toHaveLength(0);
    expect(rowsOf(client, TABLES.RECORD_MATCH_CANDIDATES).every((c) => c.status === 'rejected')).toBe(true);
    expect(rowsOf(client, TABLES.RECORD_MATCH_RESOLUTIONS)[0].new_status).toBe('unmatched');
  });

  it('rejects a candidate belonging to a different subject', async () => {
    const { client } = await seedAmbiguousCase();
    // Candidate from another subject.
    const other = await recordCandidates(client as never, {
      merchantId: MERCHANT,
      subjectEntityType: 'case',
      subjectEntityId: 'case-2',
      candidates: [{ entityType: 'order', entityId: 'o9', method: 'email' }],
    });

    await expect(
      resolveMatch(client as never, {
        merchantId: MERCHANT,
        subjectEntityType: 'case',
        subjectEntityId: 'case-1',
        selectedCandidateId: other[0].id,
        resolvedBy: USER,
      }),
    ).rejects.toThrow('candidate_not_found_for_subject');
  });
});
