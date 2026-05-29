import type { SupabaseClient } from '@supabase/supabase-js';
import { createMerchantApiKey } from '@/lib/api/apiKeys';

export type ResolvedGorgiasWidgetToken = {
  widgetToken: string;
};

export async function createWidgetTokenForGorgiasSidebar(
  service: SupabaseClient,
  merchantId: string
): Promise<ResolvedGorgiasWidgetToken> {
  const created = await createMerchantApiKey(service, merchantId, 'Gorgias sidebar widget');
  if (!created?.widgetToken) {
    throw new Error('widget_token_create_failed');
  }

  return { widgetToken: created.widgetToken };
}
