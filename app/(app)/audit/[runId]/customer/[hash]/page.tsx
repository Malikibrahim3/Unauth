import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LegacyCustomerPage({
  params,
}: {
  params: { runId: string; hash: string };
}) {
  const supabase = createClient();

  // Look up the canonical customer_profile id by email_hash
  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('email_hash', params.hash)
    .maybeSingle();

  if (profile?.id) {
    redirect(`/customers/${profile.id}?audit=${params.runId}`);
  } else {
    redirect(`/customers?audit=${params.runId}`);
  }
}
