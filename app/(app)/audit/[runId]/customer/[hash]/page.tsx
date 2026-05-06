import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function LegacyCustomerPage({
  params,
}: {
  params: Promise<{ runId: string; hash: string }>;
}) {
  const resolvedParams = await params;
  const supabase = createClient();

  // Look up the canonical customer_profile id by email_hash
  const { data: profile } = await supabase
    .from('customer_profiles')
    .select('id')
    .eq('email_hash', resolvedParams.hash)
    .maybeSingle();

  if (profile?.id) {
    redirect(`/customers/${profile.id}?audit=${resolvedParams.runId}`);
  } else {
    redirect(`/customers?audit=${resolvedParams.runId}`);
  }
}
