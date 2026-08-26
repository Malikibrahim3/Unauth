import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import {
  NEEDS_NOTIFICATION_KINDS,
  NOTIFICATION_KINDS,
  type NotificationKind,
} from '@/lib/notifications/kinds';

export { NEEDS_NOTIFICATION_KINDS, NOTIFICATION_KINDS } from '@/lib/notifications/kinds';

export const NOTIFICATION_FILTERS = ['all', 'unread', 'needs', 'sources'] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

export type NotificationListItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  target_href: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationCounts = Record<NotificationFilter, number>;

type CursorValue = { createdAt: string; id: string };

export function encodeNotificationCursor(item: Pick<NotificationListItem, 'created_at' | 'id'>): string {
  return Buffer.from(JSON.stringify({ createdAt: item.created_at, id: item.id }), 'utf8').toString('base64url');
}

export function decodeNotificationCursor(cursor: string | null | undefined): CursorValue | null {
  if (!cursor) return null;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Partial<CursorValue>;
    if (
      typeof value.createdAt !== 'string'
      || Number.isNaN(Date.parse(value.createdAt))
      || typeof value.id !== 'string'
      || !/^[0-9a-f-]{36}$/i.test(value.id)
    ) throw new Error('invalid');
    return { createdAt: value.createdAt, id: value.id };
  } catch {
    throw new Error('invalid_notification_cursor');
  }
}

function notificationQuery(client: SupabaseClient, merchantId: string, userId: string, count = false) {
  return client
    .from(TABLES.NOTIFICATIONS)
    .select(
      count ? 'id' : 'id,kind,title,body,target_href,read_at,created_at',
      count ? { count: 'exact', head: true } : undefined,
    )
    .eq('merchant_id', merchantId)
    .eq('recipient_user_id', userId)
    .in('kind', NOTIFICATION_KINDS);
}

function applyNotificationFilter(query: any, filter: NotificationFilter) {
  if (filter === 'unread') return query.is('read_at', null);
  if (filter === 'needs') return query.is('read_at', null).in('kind', NEEDS_NOTIFICATION_KINDS);
  if (filter === 'sources') {
    return query.or('kind.eq.sync_failure,target_href.like./sources/%,target_href.like./financials/reconciliation%');
  }
  return query;
}

async function countNotifications(
  client: SupabaseClient,
  merchantId: string,
  userId: string,
  filter: NotificationFilter,
): Promise<number> {
  const { count, error } = await applyNotificationFilter(
    notificationQuery(client, merchantId, userId, true),
    filter,
  );
  if (error) throw new Error(`notifications_count_failed: ${filter}: ${error.message}`);
  return count ?? 0;
}

export async function listNotificationsPage(
  client: SupabaseClient,
  merchantId: string,
  userId: string,
  options: { filter?: NotificationFilter; cursor?: string | null; limit?: number } = {},
) {
  const filter = options.filter ?? 'all';
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const cursor = decodeNotificationCursor(options.cursor);
  let query = applyNotificationFilter(notificationQuery(client, merchantId, userId), filter)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const [{ data, error }, all, unread, needs, sources] = await Promise.all([
    query,
    countNotifications(client, merchantId, userId, 'all'),
    countNotifications(client, merchantId, userId, 'unread'),
    countNotifications(client, merchantId, userId, 'needs'),
    countNotifications(client, merchantId, userId, 'sources'),
  ]);
  if (error) throw new Error(`notifications_read_failed: ${error.message}`);

  const rows = (data ?? []) as NotificationListItem[];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items,
    counts: { all, unread, needs, sources } satisfies NotificationCounts,
    pageInfo: {
      nextCursor: hasMore && items.length ? encodeNotificationCursor(items[items.length - 1]!) : null,
    },
  };
}

/** Compatibility wrapper for compact consumers that need only the first page. */
export async function listNotifications(
  client: SupabaseClient,
  merchantId: string,
  userId: string,
  options: { unreadOnly?: boolean; limit?: number } = {},
) {
  const page = await listNotificationsPage(client, merchantId, userId, {
    filter: options.unreadOnly ? 'unread' : 'all',
    limit: options.limit,
  });
  return page.items;
}

export async function markNotificationRead(client: SupabaseClient, merchantId: string, userId: string, notificationId: string) {
  const { data, error } = await client.from(TABLES.NOTIFICATIONS)
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('merchant_id', merchantId)
    .eq('recipient_user_id', userId)
    .in('kind', NOTIFICATION_KINDS)
    .select('id,read_at')
    .maybeSingle();
  if (error) throw new Error(`notification_read_update_failed: ${error.message}`);
  return data;
}

export async function markAllNotificationsRead(client: SupabaseClient, merchantId: string, userId: string) {
  const readAt = new Date().toISOString();
  const { data, error } = await client.from(TABLES.NOTIFICATIONS)
    .update({ read_at: readAt })
    .eq('merchant_id', merchantId)
    .eq('recipient_user_id', userId)
    .in('kind', NOTIFICATION_KINDS)
    .is('read_at', null)
    .select('id');
  if (error) throw new Error(`notifications_read_all_failed: ${error.message}`);
  return { updated: data?.length ?? 0, readAt };
}
