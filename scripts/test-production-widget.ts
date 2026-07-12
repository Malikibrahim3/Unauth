import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { decryptGorgiasApiCredentials } from '@/lib/support/gorgias/credentialCrypto';
import { gorgiasApiBaseUrl, gorgiasApiRequest } from '@/lib/support/gorgias/registerSidebarWidget';

const MERCHANT = 'af070af9-df1a-46ba-89f8-29409926ef61';
const APP = process.env.E2E_WIDGET_APP_URL ?? 'https://unauth-pi.vercel.app';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data } = await supabase
    .from('helpdesk_connections')
    .select('provider_base_url, access_token_encrypted, scopes')
    .eq('merchant_id', MERCHANT)
    .eq('provider', 'gorgias')
    .eq('status', 'active')
    .maybeSingle();
  const creds = decryptGorgiasApiCredentials(data!.access_token_encrypted as string);
  const api = gorgiasApiBaseUrl(data!.provider_base_url as string);
  let token: string | null = null;
  for (const entry of (data!.scopes as Array<Record<string, unknown>>) ?? []) {
    if (entry.kind === 'gorgias_sidebar_widget' && entry.integration_id) {
      const integ = await gorgiasApiRequest<{ http?: { url?: string } }>(
        api,
        `/integrations/${entry.integration_id}`,
        creds,
        { method: 'GET' },
      );
      const match = integ.http?.url?.match(/widget_token=([^&]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
  }
  const url =
    `${APP}/api/gorgias/widget?widget_token=${encodeURIComponent(token!)}` +
    '&ticket_id=67818375&customer_email=simsorsno3@icloud.com&order_number=1013';
  const res = await fetch(url);
  const body = await res.json();
  console.log(
    JSON.stringify(
      {
        app: APP,
        status: res.status,
        uses_mock_fallback:
          (body as Record<string, string>).context_summary?.includes('Context unavailable') ?? false,
        identity: (body as Record<string, string>).identity,
        payout_exposure: (body as Record<string, string>).payout_exposure,
        evidence_checklist: (body as Record<string, string>).evidence_checklist,
        recommendation: (body as Record<string, string>).recommendation,
        context_summary: (body as Record<string, string>).context_summary,
      },
      null,
      2,
    ),
  );
}

main();
