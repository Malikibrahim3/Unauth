import { TABLES } from '@/lib/supabase/tables';
import {
  gorgiasBaseUrlFromDomain,
  normalizeGorgiasBaseUrl,
  normalizeGorgiasDomain,
  type GorgiasAccountIdentity,
} from '@/lib/support/gorgias/accountIdentity';

export type GorgiasSupportConnectionRow = {
  id: string;
  merchant_id: string;
  provider_account_id: string | null;
  provider_base_url: string | null;
  status: string;
  webhook_secret_hash: string | null;
};

export type GorgiasConnectionResolution =
  | {
      connection: GorgiasSupportConnectionRow;
      match: 'account_id' | 'domain';
    }
  | { error: 'not_found' | 'ambiguous' };

type ListableSupabase = {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => Promise<{
          data: GorgiasSupportConnectionRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export async function listActiveGorgiasSupportConnections(
  supabase: unknown
): Promise<GorgiasSupportConnectionRow[]> {
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select(
      'id, merchant_id, provider_account_id, provider_base_url, status, webhook_secret_hash'
    )
    .eq('provider', 'gorgias')
    .eq('status', 'active');

  if (error) {
    throw new Error(`list_gorgias_connections_failed: ${error.message}`);
  }

  return data ?? [];
}

function connectionBaseUrl(connection: GorgiasSupportConnectionRow): string | null {
  if (!connection.provider_base_url) return null;
  return normalizeGorgiasBaseUrl(connection.provider_base_url);
}

function matchesAccountId(
  connection: GorgiasSupportConnectionRow,
  accountId: string
): boolean {
  if (!connection.provider_account_id) return false;
  return connection.provider_account_id.trim() === accountId.trim();
}

function matchesDomain(
  connection: GorgiasSupportConnectionRow,
  identity: GorgiasAccountIdentity
): boolean {
  const targetBaseUrl = identity.provider_base_url
    ? normalizeGorgiasBaseUrl(identity.provider_base_url)
    : identity.domain
      ? gorgiasBaseUrlFromDomain(identity.domain)
      : null;

  if (!targetBaseUrl) return false;

  const connectionUrl = connectionBaseUrl(connection);
  if (connectionUrl && connectionUrl === targetBaseUrl) {
    return true;
  }

  if (connection.provider_account_id && identity.domain) {
    return normalizeGorgiasDomain(connection.provider_account_id) === identity.domain;
  }

  return false;
}

export function matchGorgiasSupportConnection(
  connections: GorgiasSupportConnectionRow[],
  identity: GorgiasAccountIdentity
): GorgiasConnectionResolution {
  const active = connections.filter((row) => row.status === 'active');

  if (identity.provider_account_id) {
    const byAccount = active.filter((row) =>
      matchesAccountId(row, identity.provider_account_id as string)
    );
    if (byAccount.length === 1) {
      return { connection: byAccount[0], match: 'account_id' };
    }
    if (byAccount.length > 1) {
      return { error: 'ambiguous' };
    }
  }

  const byDomain = active.filter((row) => matchesDomain(row, identity));
  if (byDomain.length === 1) {
    return { connection: byDomain[0], match: 'domain' };
  }
  if (byDomain.length > 1) {
    return { error: 'ambiguous' };
  }

  return { error: 'not_found' };
}

export async function resolveGorgiasSupportConnection(
  supabase: unknown,
  identity: GorgiasAccountIdentity
): Promise<GorgiasConnectionResolution> {
  const connections = await listActiveGorgiasSupportConnections(supabase);
  return matchGorgiasSupportConnection(connections, identity);
}
