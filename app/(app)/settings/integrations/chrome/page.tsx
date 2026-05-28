import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Chrome } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import ChromeSetupClient from '@/components/settings/ChromeSetupClient';

export default async function ChromeIntegrationPage() {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, PERMISSIONS.VIEW_SETTINGS);
  if (denied) redirect('/settings');

  const { data: keys } = await service
    .from(TABLES.MERCHANT_API_KEYS)
    .select('key_prefix')
    .eq('merchant_id', ctx.merchantId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false }) as unknown as {
    data: Array<{ key_prefix: string }> | null;
  };

  const keyPrefixes = (keys ?? []).map((k) => k.key_prefix);

  return (
    <div className="space-y-8 p-8 max-w-2xl">
      <div>
        <Link
          href="/settings/integrations"
          className="mb-4 inline-flex items-center gap-1.5 text-xs hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Integrations
        </Link>
        <div className="flex items-center gap-3">
          <img
            src="/integrations/chrome.svg"
            alt=""
            width={32}
            height={32}
            style={{ objectFit: 'contain' }}
          />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
            Install Chrome Extension
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Look up any customer email from any tab — Gorgias, Zendesk, Shopify, Gmail
        </p>
      </div>

      <ChromeSetupClient hasApiKeys={keyPrefixes.length > 0} keyPrefixes={keyPrefixes} />
    </div>
  );
}
