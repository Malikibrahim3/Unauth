import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import FoundingMerchantApplicationForm from '@/components/apply/FoundingMerchantApplicationForm';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

export default async function ApplyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: merchant } = await supabase
    .from(TABLES.MERCHANTS)
    .select('id, name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!merchant) redirect('/dashboard');

  const { data: completedAudit } = await supabase
    .from(TABLES.PROCESSING_JOBS)
    .select('id')
    .eq('merchant_id', (merchant as { id: string }).id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!completedAudit) redirect('/dashboard');

  return (
    <div>
      <AuthenticatedPageHeader
        eyebrow="Programme application"
        title="Founding merchant application"
        subtitle="Tell us about your operation and the payout-control workflows you want to improve."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Application' }]}
      />
      <div className={pageStyles.pageBody}>
        <AuthenticatedPanel>
          <div className="p-4">
            <FoundingMerchantApplicationForm defaultStoreName={(merchant as { name: string }).name} />
          </div>
        </AuthenticatedPanel>
      </div>
    </div>
  );
}
