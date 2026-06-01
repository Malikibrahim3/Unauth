import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { getMerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import Link from 'next/link';

/**
 * /store — resolves the merchant's latest Shopify-sourced processing job and
 * redirects straight to the audit detail view. Framed as "Store overview" in
 * the nav; the audit page header adapts its copy when upload_type = 'shopify'.
 */
export default async function StorePage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) redirect('/dashboard');

  const { data: job } = await serviceClient
    .from(TABLES.PROCESSING_JOBS)
    .select('id')
    .eq('merchant_id', ctx.merchantId)
    .eq('upload_type', 'shopify')
    .eq('hidden_by_merchant', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (job) {
    redirect(`/audit/${job.id}?source=shopify`);
  }

  // No Shopify-sourced processing job. That alone does NOT mean the merchant is
  // empty — they may have Shopify signals, imported profiles, or claims with no
  // current job row. Only show the first-run connect prompt when there is no
  // useful data at all; otherwise point to the live intelligence surfaces.
  const { presence } = await getMerchantSetupState(serviceClient, ctx.merchantId, user.id);

  if (presence.hasAnyData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-heading-lg font-semibold" style={{ color: 'var(--ink-primary)' }}>
            Store overview is being prepared
          </h1>
          <p className="text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
            We have data for your store, but a dedicated Shopify store view hasn&apos;t been generated yet. In the meantime, review your customers and reports — they already reflect the data we have.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/customers"
              className="btn-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors"
            >
              Review customers
            </Link>
            <Link href="/reports" className="text-sm font-medium hover:underline" style={{ color: 'var(--ink-tertiary)' }}>
              View reports →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No Shopify job and no useful data — prompt to connect
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-md w-full text-center space-y-4">
        <div
          className="inline-flex h-14 w-14 items-center justify-center rounded-xl mb-2"
          style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--accent)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 2.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
          </svg>
        </div>
        <h1 className="text-heading-lg font-semibold" style={{ color: 'var(--ink-primary)' }}>
          Connect Shopify and your helpdesk
        </h1>
        <p className="text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
          Store intelligence requires both your Shopify store and a helpdesk (Gorgias or Zendesk). Orders come from Shopify — claim history comes from your helpdesk. Without both, the data here would be incomplete.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/settings/integrations"
            className="btn-accent inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors"
          >
            Set up integrations
          </Link>
          <Link
            href="/upload"
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            Upload a CSV instead →
          </Link>
        </div>
      </div>
    </div>
  );
}
