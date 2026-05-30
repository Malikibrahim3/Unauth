import { createServiceClient } from '@/lib/supabase/server';
import { logWebhookResult, type WebhookLogInput } from '@/lib/support/intake/store';

/**
 * Best-effort webhook delivery logging. Creates its own service client and
 * never throws, so the webhook response is never affected by logging.
 *
 * Lives in lib (not the route) so the route file does not itself open a
 * service-role client — auth gating happens inside the ingestion path.
 */
export async function logGorgiasWebhookResult(entry: WebhookLogInput): Promise<void> {
  try {
    await logWebhookResult(createServiceClient(), entry);
  } catch {
    // Swallow — logging must not break the webhook response.
  }
}
