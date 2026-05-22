import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingClient from '@/components/OnboardingClient';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: merchant } = await serviceClient
    .from('merchants')
    .select('name, platform, monthly_order_volume, primary_fraud_concern')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <OnboardingClient
      userId={user.id}
      initialStoreName={(merchant as { name?: string | null } | null)?.name ?? (user.user_metadata?.store_name as string | undefined) ?? ''}
      initialPlatform={(merchant as { platform?: string | null } | null)?.platform ?? (user.user_metadata?.platform as string | undefined) ?? ''}
      initialAnnualVolume={(merchant as { monthly_order_volume?: string | null } | null)?.monthly_order_volume ?? (user.user_metadata?.monthly_order_volume as string | undefined) ?? ''}
      initialPrimaryConcern={(merchant as { primary_fraud_concern?: string | null } | null)?.primary_fraud_concern ?? (user.user_metadata?.primary_fraud_concern as string | undefined) ?? ''}
    />
  );
}
