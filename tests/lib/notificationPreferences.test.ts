import { filterInAppNotificationRecipients, upsertNotificationPreference } from '@/lib/collaboration/notificationPreferences';

const MERCHANT = 'm-1';

function makeClient(rows: Array<{ user_id: string; in_app_enabled: boolean }>) {
  const upserts: Array<Record<string, unknown>> = [];
  const client = {
    upserts,
    from() {
      let upsertRow: Record<string, unknown> | null = null;
      const b: Record<string, unknown> = {};
      const chain = () => b;
      for (const m of ['select', 'eq', 'in']) b[m] = chain;
      b.upsert = (row: Record<string, unknown>) => { upsertRow = row; return b; };
      b.single = async () => { if (upsertRow) upserts.push(upsertRow); return { data: upsertRow, error: null }; };
      b.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
      return b;
    },
  };
  return client as never as import('@supabase/supabase-js').SupabaseClient & { upserts: typeof upserts };
}

describe('notification preferences', () => {
  it('defaults unknown recipients to in-app enabled', async () => {
    const client = makeClient([]);
    const result = await filterInAppNotificationRecipients(client, MERCHANT, ['u1', 'u2'], 'mention');
    expect(result).toEqual(['u1', 'u2']);
  });

  it('drops recipients who muted the kind in-app', async () => {
    const client = makeClient([{ user_id: 'u2', in_app_enabled: false }]);
    const result = await filterInAppNotificationRecipients(client, MERCHANT, ['u1', 'u2', 'u3'], 'mention');
    expect(result).toEqual(['u1', 'u3']);
  });

  it('returns empty for no candidates without querying', async () => {
    const client = makeClient([]);
    expect(await filterInAppNotificationRecipients(client, MERCHANT, [], 'mention')).toEqual([]);
  });

  it('upserts a preference for the caller', async () => {
    const client = makeClient([]);
    await upsertNotificationPreference(client, MERCHANT, 'u1', { kind: 'mention', in_app_enabled: false, email_enabled: true });
    expect(client.upserts[0]).toMatchObject({ merchant_id: MERCHANT, user_id: 'u1', kind: 'mention', in_app_enabled: false, email_enabled: true });
  });
});
