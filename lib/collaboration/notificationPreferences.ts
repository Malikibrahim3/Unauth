/**
 * Per-user notification preferences (in-app + email) by notification kind.
 *
 * Rows are sparse: absence means the default (in-app on, email off). Callers
 * that create notifications filter recipients through
 * `filterInAppNotificationRecipients` so a user who has muted a kind in-app is
 * not notified. Email delivery is gated by `email_enabled` and consumed by the
 * email delivery worker (a row is only queued for email when opted in).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';

export type NotificationPreference = {
  kind: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  updated_at?: string;
};

export const DEFAULT_PREFERENCE = { in_app_enabled: true, email_enabled: false };

export const preferenceUpsertSchema = z.object({
  kind: z.string().trim().min(1).max(80),
  in_app_enabled: z.boolean(),
  email_enabled: z.boolean(),
});

export async function listNotificationPreferences(
  client: SupabaseClient,
  merchantId: string,
  userId: string,
): Promise<NotificationPreference[]> {
  const { data, error } = await client
    .from(TABLES.NOTIFICATION_PREFERENCES)
    .select('kind,in_app_enabled,email_enabled,updated_at')
    .eq('merchant_id', merchantId)
    .eq('user_id', userId);
  if (error) throw new Error(`notification_preferences_read_failed: ${error.message}`);
  return (data ?? []) as NotificationPreference[];
}

export async function upsertNotificationPreference(
  client: SupabaseClient,
  merchantId: string,
  userId: string,
  input: z.infer<typeof preferenceUpsertSchema>,
): Promise<NotificationPreference> {
  const parsed = preferenceUpsertSchema.parse(input);
  const { data, error } = await client
    .from(TABLES.NOTIFICATION_PREFERENCES)
    .upsert(
      { merchant_id: merchantId, user_id: userId, kind: parsed.kind, in_app_enabled: parsed.in_app_enabled, email_enabled: parsed.email_enabled, updated_at: new Date().toISOString() },
      { onConflict: 'merchant_id,user_id,kind' },
    )
    .select('kind,in_app_enabled,email_enabled,updated_at')
    .single();
  if (error) throw new Error(`notification_preferences_upsert_failed: ${error.message}`);
  return data as NotificationPreference;
}

/**
 * Given candidate recipient user ids, return those who have NOT muted the given
 * kind in-app. Users with no preference row default to enabled.
 */
export async function filterInAppNotificationRecipients(
  client: SupabaseClient,
  merchantId: string,
  userIds: string[],
  kind: string,
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await client
    .from(TABLES.NOTIFICATION_PREFERENCES)
    .select('user_id,in_app_enabled')
    .eq('merchant_id', merchantId)
    .eq('kind', kind)
    .in('user_id', userIds);
  if (error) throw new Error(`notification_preferences_filter_failed: ${error.message}`);
  const muted = new Set(
    (data ?? [])
      .filter((row: { in_app_enabled: boolean }) => row.in_app_enabled === false)
      .map((row: { user_id: string }) => row.user_id),
  );
  return userIds.filter((id) => !muted.has(id));
}
