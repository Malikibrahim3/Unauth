import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { upsertMerchantForUser } from '@/lib/account/upsertMerchantForUser';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const meta = data.user.user_metadata ?? {};
      const serviceClient = createServiceClient();

      // If sign-up metadata is present and no merchant row exists yet, create it.
      // This runs server-side with service-role privileges so onboarding never
      // depends on browser-side RLS access to the merchants table.
      if (meta.store_name) {
        await upsertMerchantForUser(serviceClient, {
          userId: data.user.id,
          email: data.user.email,
          storeName: meta.store_name ? String(meta.store_name) : null,
          platform: meta.platform ? String(meta.platform) : null,
          monthlyOrderVolume: meta.monthly_order_volume ? String(meta.monthly_order_volume) : null,
          primaryFraudConcern: meta.primary_fraud_concern ? String(meta.primary_fraud_concern) : null,
          setupComplete: false,
        });
      }

      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
