// lib/customers/activityLog.ts
// Server-side helper for recording customer activity events.
//
// v2 SCHEMA NOTE: the legacy `customer_activity_log` table was dropped in the
// v2 cutover and has no replacement. This helper is intentionally a safe no-op
// so existing call sites keep working without throwing. Activity logging was
// always best-effort (errors were swallowed), so degrading to a no-op preserves
// the original contract: the main flow is never affected.

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
 * Record a customer activity event.
 *
 * No-op under the v2 schema: `customer_activity_log` no longer exists. The
 * signature is preserved so callers do not need to change. Returns immediately
 * and never throws.
 */
export async function writeActivityLog(_params: ActivityLogParams): Promise<void> {
  // Intentionally does nothing — see v2 schema note above.
  return;
}
