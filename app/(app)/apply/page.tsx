import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import FoundingMerchantApplicationForm from '@/components/apply/FoundingMerchantApplicationForm';

export default async function ApplyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!merchant) notFound();

  const { data: completedAudit } = await supabase
    .from('processing_jobs')
    .select('id')
    .eq('merchant_id', (merchant as { id: string }).id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!completedAudit) notFound();

  return (
    <div className="p-6 md:p-8">
      <div className="mx-auto max-w-2xl">
        <FoundingMerchantApplicationForm defaultStoreName={(merchant as { name: string }).name} />
      </div>
    </div>
  );
}
