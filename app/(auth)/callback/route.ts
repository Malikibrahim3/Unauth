import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const meta = data.user.user_metadata ?? {};

      // If sign-up metadata is present and no merchant row exists yet, create it
      if (meta.store_name) {
        const { count } = await supabase
          .from('merchants')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', data.user.id);

        if (!count) {
          await supabase.from('merchants').insert({
            user_id: data.user.id,
            name: String(meta.store_name),
            platform: meta.platform ? String(meta.platform) : null,
            monthly_order_volume: meta.monthly_order_volume ? String(meta.monthly_order_volume) : null,
            primary_fraud_concern: meta.primary_fraud_concern ? String(meta.primary_fraud_concern) : null,
            setup_complete: true,
          });
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
