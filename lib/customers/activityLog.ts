// lib/customers/activityLog.ts
// Server-side helper for writing to the customer_activity_log table.
// Must only be called from API routes — never from client components.

import type { SupabaseClient } from '@supabase/supabase-js';

type EventType =
  | 'profile_created'
  | 'status_changed'
  | 'note_added'
  | 'note_deleted'
  | 'watchlist_added'
  | 'watchlist_removed'
  | 'evidence_generated'
  | 'audit_appearance'
  | 'manually_reviewed';

interface ActivityLogParams {
  supabase: SupabaseClient;
  profileId: string;
  merchantId: string;
  eventType: EventType;
  eventData?: Record<string, unknown>;
}

/**
 * Write a single event to customer_activity_log.
 * Silently swallows errors — activity logging must never break the main flow.
 */
export async function writeActivityLog({
  supabase,
  profileId,
  merchantId,
  eventType,
  eventData = {},
}: ActivityLogParams): Promise<void> {
  try {
    await (supabase as any)
      .from('customer_activity_log')
      .insert({
        profile_id:  profileId,
        merchant_id: merchantId,
        event_type:  eventType,
        event_data:  eventData,
      });
  } catch (err) {
    console.error('[activityLog] write failed:', err);
  }
}
