import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import FoundingMerchantApplicationForm from '@/components/apply/FoundingMerchantApplicationForm';

export default async function ApplyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from(TABLES.MERCHANT_MEMBERS)
    .select('merchant_id, merchants(name)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .eq('invite_status', 'active')
    .maybeSingle();

  if (!membership) redirect('/dashboard');

  const merchant = {
    id: membership.merchant_id,
    name: (membership.merchants as { name?: string | null } | null)?.name ?? 'Your store',
  };

  const { data: completedAudit } = await supabase
    .from(TABLES.PROCESSING_JOBS)
    .select('id')
    .eq('merchant_id', merchant.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!completedAudit) redirect('/dashboard');

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <FoundingMerchantApplicationForm defaultStoreName={merchant.name} />
      </div>
    </div>
  );
}
