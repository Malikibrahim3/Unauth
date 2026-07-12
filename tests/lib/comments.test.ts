jest.mock('@/lib/events/domainEventStore', () => ({ recordDomainEvent: jest.fn().mockResolvedValue(undefined) }));

import { editCaseComment, deleteCaseComment } from '@/lib/collaboration/comments';

const MERCHANT = 'm-1';
const CASE = 'c-1';
const AUTHOR = 'u-author';

function makeClient(comment: Record<string, unknown> | null) {
  const inserted: Array<{ table: string; row: Record<string, unknown> }> = [];
  const updated: Array<{ table: string; patch: Record<string, unknown> }> = [];
  const client = {
    inserted,
    updated,
    from(table: string) {
      let patch: Record<string, unknown> | null = null;
      const b: Record<string, unknown> = {};
      const chain = () => b;
      for (const m of ['select', 'eq', 'order', 'in', 'limit']) b[m] = chain;
      b.update = (p: Record<string, unknown>) => { patch = p; return b; };
      b.insert = (row: Record<string, unknown>) => {
        inserted.push({ table, row });
        return { error: null, select: () => ({ single: async () => ({ data: { id: 'evt', ...row }, error: null }) }) };
      };
      b.maybeSingle = async () => ({ data: comment, error: null });
      b.single = async () => {
        if (patch) updated.push({ table, patch });
        return { data: { id: 'cmt', author_user_id: AUTHOR, body: patch?.body ?? '', edited_at: patch?.edited_at ?? null, created_at: 't' }, error: null };
      };
      b.then = (resolve: (v: unknown) => unknown) => { if (patch) updated.push({ table, patch }); return resolve({ data: null, error: null }); };
      return b;
    },
  };
  return client as never as import('@supabase/supabase-js').SupabaseClient & { inserted: typeof inserted; updated: typeof updated };
}

const live = { id: 'cmt', author_user_id: AUTHOR, support_payout_case_id: CASE, deleted_at: null };

describe('case comment edit/delete', () => {
  afterEach(() => jest.clearAllMocks());

  it('edits the author’s own live comment, stamps edited_at, and audits it', async () => {
    const client = makeClient(live);
    const result = await editCaseComment(client, { merchantId: MERCHANT, caseId: CASE, commentId: 'cmt', actorUserId: AUTHOR, body: 'Updated body' });
    expect(result.ok).toBe(true);
    expect(client.updated.find((u) => u.table === 'case_comments')?.patch).toMatchObject({ body: 'Updated body' });
    expect(client.updated.find((u) => u.table === 'case_comments')?.patch.edited_at).toBeTruthy();
    expect(client.inserted.find((i) => i.table === 'case_comment_events')?.row).toMatchObject({ event_type: 'edited', body_snapshot: 'Updated body' });
  });

  it('refuses to edit another member’s comment', async () => {
    const client = makeClient({ ...live, author_user_id: 'someone-else' });
    const result = await editCaseComment(client, { merchantId: MERCHANT, caseId: CASE, commentId: 'cmt', actorUserId: AUTHOR, body: 'x' });
    expect(result).toEqual({ ok: false, reason: 'forbidden' });
    expect(client.updated).toHaveLength(0);
  });

  it('refuses to edit a deleted comment', async () => {
    const client = makeClient({ ...live, deleted_at: '2026-01-01' });
    const result = await editCaseComment(client, { merchantId: MERCHANT, caseId: CASE, commentId: 'cmt', actorUserId: AUTHOR, body: 'x' });
    expect(result).toEqual({ ok: false, reason: 'deleted' });
  });

  it('returns not_found for a missing/cross-merchant comment', async () => {
    const client = makeClient(null);
    expect(await editCaseComment(client, { merchantId: MERCHANT, caseId: CASE, commentId: 'x', actorUserId: AUTHOR, body: 'x' })).toEqual({ ok: false, reason: 'not_found' });
  });

  it('soft-deletes the author’s comment with an audit event', async () => {
    const client = makeClient(live);
    const result = await deleteCaseComment(client, { merchantId: MERCHANT, caseId: CASE, commentId: 'cmt', actorUserId: AUTHOR });
    expect(result).toEqual({ ok: true });
    expect(client.updated.find((u) => u.table === 'case_comments')?.patch).toMatchObject({ body: '[deleted]' });
    expect(client.updated.find((u) => u.table === 'case_comments')?.patch.deleted_at).toBeTruthy();
    expect(client.inserted.find((i) => i.table === 'case_comment_events')?.row).toMatchObject({ event_type: 'deleted' });
  });

  it('is idempotent when the comment is already deleted', async () => {
    const client = makeClient({ ...live, deleted_at: '2026-01-01' });
    const result = await deleteCaseComment(client, { merchantId: MERCHANT, caseId: CASE, commentId: 'cmt', actorUserId: AUTHOR });
    expect(result).toEqual({ ok: true, alreadyDeleted: true });
    expect(client.updated).toHaveLength(0);
  });
});
