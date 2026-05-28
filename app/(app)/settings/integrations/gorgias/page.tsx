import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { env } from '@/lib/utils/env';
import GorgiasSetupClient from '@/components/settings/GorgiasSetupClient';

export default async function GorgiasIntegrationPage() {
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
          <MessageSquare className="h-5 w-5" style={{ color: '#FF6B35' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
            Connect Gorgias
          </h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Add Unauth fraud intelligence to every support ticket
        </p>
      </div>

      <GorgiasSetupClient
        appBaseUrl={env.NEXT_PUBLIC_APP_URL}
        hasApiKeys={keyPrefixes.length > 0}
        keyPrefixes={keyPrefixes}
      />
    </div>
  );
}
