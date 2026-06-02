import { TABLES } from '@/lib/supabase/tables';
import {
  freshdeskBaseUrlFromDomain,
  normalizeFreshdeskBaseUrl,
  normalizeFreshdeskDomain,
  type FreshdeskAccountIdentity,
} from '@/lib/support/freshdesk/accountIdentity';

export type FreshdeskSupportConnectionRow = {
  id: string;
  merchant_id: string;
  provider_account_id: string | null;
  provider_base_url: string | null;
  status: string;
  webhook_secret_hash: string | null;
};

export type FreshdeskConnectionResolution =
  | {
      connection: FreshdeskSupportConnectionRow;
      match: 'account_id' | 'domain';
    }
  | { error: 'not_found' | 'ambiguous' };

type ListableSupabase = {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => Promise<{
          data: FreshdeskSupportConnectionRow[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

export async function listActiveFreshdeskSupportConnections(
  supabase: unknown
): Promise<FreshdeskSupportConnectionRow[]> {
  const { data, error } = await (supabase as ListableSupabase)
    .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
    .select(
      'id, merchant_id, provider_account_id, provider_base_url, status, webhook_secret_hash'
    )
    .eq('provider', 'freshdesk')
    .eq('status', 'active');

  if (error) {
    throw new Error(`list_freshdesk_connections_failed: ${error.message}`);
  }

  return data ?? [];
}

function matchesDomain(
  connection: FreshdeskSupportConnectionRow,
  identity: FreshdeskAccountIdentity
): boolean {
  const targetBaseUrl = identity.provider_base_url
    ? normalizeFreshdeskBaseUrl(identity.provider_base_url)
    : identity.domain
      ? freshdeskBaseUrlFromDomain(identity.domain)
      : null;

  if (!targetBaseUrl) return false;

  const connectionUrl = connection.provider_base_url
    ? normalizeFreshdeskBaseUrl(connection.provider_base_url)
    : null;
  if (connectionUrl && connectionUrl === targetBaseUrl) {
    return true;
  }

  if (connection.provider_account_id && identity.domain) {
    return (
      normalizeFreshdeskDomain(connection.provider_account_id) ===
      normalizeFreshdeskDomain(identity.domain)
    );
  }

  return false;
}

export function matchFreshdeskSupportConnection(
  connections: FreshdeskSupportConnectionRow[],
  identity: FreshdeskAccountIdentity
): FreshdeskConnectionResolution {
  const active = connections.filter((row) => row.status === 'active');

  if (identity.provider_account_id) {
    const byAccount = active.filter(
      (row) =>
        row.provider_account_id &&
        normalizeFreshdeskDomain(row.provider_account_id) ===
          normalizeFreshdeskDomain(identity.provider_account_id as string)
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

export async function resolveFreshdeskSupportConnection(
  supabase: unknown,
  identity: FreshdeskAccountIdentity
): Promise<FreshdeskConnectionResolution> {
  const connections = await listActiveFreshdeskSupportConnections(supabase);
  return matchFreshdeskSupportConnection(connections, identity);
}
