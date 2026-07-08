import { TABLES } from '@/lib/supabase/tables';
import {
  normalizeZendeskSubdomain,
  zendeskBaseUrlFromSubdomain,
} from '@/lib/support/zendesk/accountIdentity';
import type { ZendeskAccountIdentity } from '@/lib/support/zendesk/webhookIdentity';

export type ZendeskSupportConnectionRow = {
  id: string;
  merchant_id: string;
  provider_account_id: string | null;
  provider_base_url: string | null;
  status: string;
  webhook_secret_hash: string | null;
};

export type ZendeskConnectionResolution =
  | {
      connection: ZendeskSupportConnectionRow;
      match: 'subdomain';
    }
  | { error: 'not_found' | 'ambiguous' };

type ListableSupabase = {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => Promise<{
          data: ZendeskSupportConnectionRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export async function listActiveZendeskSupportConnections(
  supabase: unknown
): Promise<ZendeskSupportConnectionRow[]> {
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select(
      'id, merchant_id, provider_account_id, provider_base_url, status, webhook_secret_hash'
    )
    .eq('provider', 'zendesk')
    .eq('status', 'active');

  if (error) {
    throw new Error(`list_zendesk_connections_failed: ${error.message}`);
  }

  return data ?? [];
}

function connectionBaseUrl(connection: ZendeskSupportConnectionRow): string | null {
  if (!connection.provider_base_url) return null;
  try {
    return new URL(connection.provider_base_url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchesSubdomain(
  connection: ZendeskSupportConnectionRow,
  identity: ZendeskAccountIdentity
): boolean {
  const targetSubdomain = identity.subdomain
    ? normalizeZendeskSubdomain(identity.subdomain)
    : null;
  if (!targetSubdomain) return false;

  if (
    connection.provider_account_id &&
    normalizeZendeskSubdomain(connection.provider_account_id) === targetSubdomain
  ) {
    return true;
  }

  const connectionHost = connectionBaseUrl(connection);
  const targetHost = zendeskBaseUrlFromSubdomain(targetSubdomain).replace(/^https?:\/\//, '');
  return Boolean(connectionHost && connectionHost === targetHost);
}

export function matchZendeskSupportConnection(
  connections: ZendeskSupportConnectionRow[],
  identity: ZendeskAccountIdentity
): ZendeskConnectionResolution {
  const active = connections.filter((row) => row.status === 'active');

  const bySubdomain = active.filter((row) => matchesSubdomain(row, identity));
  if (bySubdomain.length === 1) {
    return { connection: bySubdomain[0], match: 'subdomain' };
  }
  if (bySubdomain.length > 1) {
    return { error: 'ambiguous' };
  }

  return { error: 'not_found' };
}

export async function resolveZendeskSupportConnection(
  supabase: unknown,
  identity: ZendeskAccountIdentity
): Promise<ZendeskConnectionResolution> {
  const connections = await listActiveZendeskSupportConnections(supabase);
  return matchZendeskSupportConnection(connections, identity);
}
