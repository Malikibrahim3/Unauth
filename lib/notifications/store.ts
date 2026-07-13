import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export async function listNotifications(client: SupabaseClient, merchantId: string, userId: string, options: { unreadOnly?: boolean; limit?: number } = {}) {
  let query = client.from(TABLES.NOTIFICATIONS)
    .select('id,kind,title,body,target_href,read_at,created_at')
    .eq('merchant_id', merchantId)
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(Math.min(options.limit ?? 100, 200));
  if (options.unreadOnly) query = query.is('read_at', null);
  const { data, error } = await query;
  if (error) throw new Error(`notifications_read_failed: ${error.message}`);
  return data ?? [];
}

export async function markNotificationRead(client: SupabaseClient, merchantId: string, userId: string, notificationId: string) {
  const { data, error } = await client.from(TABLES.NOTIFICATIONS)
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('merchant_id', merchantId)
    .eq('recipient_user_id', userId)
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
    .is('read_at', null)
    .select('id');
  if (error) throw new Error(`notifications_read_all_failed: ${error.message}`);
  return { updated: data?.length ?? 0, readAt };
}
