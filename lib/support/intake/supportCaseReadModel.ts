import { TABLES } from '@/lib/supabase/tables';

export type PublicSupportCaseContext = {
  id: string;
  provider: string;
  external_case_id: string;
  external_url: string | null;
  case_status: string | null;
  claim_reason: string | null;
  customer_message_summary: string | null;
  agent_notes_summary: string | null;
  tags: unknown[];
  link_status: string;
  shopify_order_id: string | null;
  order_ref: string | null;
  claim_candidate: boolean;
  merchant_claim_id: string | null;
  updated_at_provider: string | null;
};

const SAFE_CASE_COLUMNS =
  'id, provider, external_case_id, external_url, case_status, claim_reason, customer_message_summary, agent_notes_summary, tags, link_status, shopify_order_id, order_ref, link_metadata, merchant_claim_id, updated_at_provider, provider_connection_id';

/** Human-facing ticket path for a provider, given a base origin and ticket id. */
function humanTicketPath(provider: string, base: string, id: string): string | null {
  const origin = base.replace(/\/$/, '');
  if (provider === 'zendesk') return `${origin}/agent/tickets/${encodeURIComponent(id)}`;
  if (provider === 'gorgias') return `${origin}/app/ticket/${encodeURIComponent(id)}`;
  if (provider === 'freshdesk') return `${origin}/a/tickets/${encodeURIComponent(id)}`;
  return null;
}

/**
 * Resolves the human helpdesk URL for a support case.
 *
 * The stored `external_url` is unreliable: legacy rows hold relative API paths
 * (e.g. `/api/tickets/63308351/`), some hold absolute API URLs, and some hold
 * the correct human URL. We rebuild deterministically:
 *   1. If we know the provider connection's base origin, build the canonical
 *      human path from base + provider + case id (authoritative).
 *   2. Otherwise, if the stored URL is absolute, repair its path to the human
 *      route (preserving its origin).
 *   3. Otherwise there is nothing safe to link to → null.
 */
function toHumanHelpdeskUrl(
  provider: string,
  externalUrl: unknown,
  externalCaseId: unknown,
  baseUrl: string | null,
): string | null {
  const id = String(externalCaseId ?? '').trim();

  // 1. Authoritative: rebuild from the connection's base origin.
  if (baseUrl && id) {
    try {
      const built = humanTicketPath(provider, new URL(baseUrl).origin, id);
      if (built) return built;
    } catch {
      // Malformed base URL on the connection — fall through to repair below.
    }
  }

  if (typeof externalUrl !== 'string' || !externalUrl.trim()) return null;

  // 2. Repair an absolute stored URL (relative paths throw here → caught).
  try {
    const url = new URL(externalUrl.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    if (id) {
      const repaired = humanTicketPath(provider, url.origin, id);
      if (repaired && !url.pathname.includes('/agent/tickets/') && !url.pathname.includes('/app/ticket/')) {
        return repaired;
      }
    }
    return url.toString();
  } catch {
    return null;
  }
}

function toPublicSupportCase(
  row: Record<string, unknown>,
  baseUrlByConnection: Map<string, string>,
): PublicSupportCaseContext {
  const connectionId =
    typeof row.provider_connection_id === 'string' ? row.provider_connection_id : null;
  const baseUrl = connectionId ? baseUrlByConnection.get(connectionId) ?? null : null;
  const linkMetadata =
    row.link_metadata && typeof row.link_metadata === 'object' && !Array.isArray(row.link_metadata)
      ? (row.link_metadata as Record<string, unknown>)
      : {};

  return {
    id: String(row.id),
    provider: String(row.provider),
    external_case_id: String(row.external_case_id),
    external_url: toHumanHelpdeskUrl(String(row.provider), row.external_url, row.external_case_id, baseUrl),
    case_status: typeof row.case_status === 'string' ? row.case_status : null,
    claim_reason: typeof row.claim_reason === 'string' ? row.claim_reason : null,
    customer_message_summary:
      typeof row.customer_message_summary === 'string' ? row.customer_message_summary : null,
    agent_notes_summary:
      typeof row.agent_notes_summary === 'string' ? row.agent_notes_summary : null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    link_status: typeof row.link_status === 'string' ? row.link_status : 'unlinked',
    shopify_order_id: typeof row.shopify_order_id === 'string' ? row.shopify_order_id : null,
    order_ref: typeof row.order_ref === 'string' ? row.order_ref : null,
    claim_candidate: linkMetadata.claim_candidate === true,
    merchant_claim_id:
      typeof row.merchant_claim_id === 'string' ? row.merchant_claim_id : null,
    updated_at_provider:
      typeof row.updated_at_provider === 'string' ? row.updated_at_provider : null,
  };
}

type FilterClient = {
  from: (table: string) => Record<string, unknown>;
};

type ConnectionBaseClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => Promise<{
        data: Array<Record<string, unknown>> | null;
        error: { message: string } | null;
      }>;
    };
  };
};

/**
 * Best-effort lookup of each provider connection's base origin for a merchant.
 * Used to rebuild canonical human helpdesk URLs at read time. Failures (e.g.
 * a client mock without the connections table) degrade to an empty map rather
 * than blocking the support-case list.
 */
async function fetchConnectionBaseUrls(
  supabase: unknown,
  merchantId: string,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { data } = await (supabase as ConnectionBaseClient)
      .from(TABLES.SUPPORT_PROVIDER_CONNECTIONS)
      .select('id, provider_base_url')
      .eq('merchant_id', merchantId);
    for (const row of data ?? []) {
      const id = typeof row.id === 'string' ? row.id : null;
      const base =
        typeof row.provider_base_url === 'string' && row.provider_base_url.trim()
          ? row.provider_base_url.trim()
          : null;
      if (id && base) map.set(id, base);
    }
  } catch {
    // Best-effort: no base origins resolved.
  }
  return map;
}

export async function listSupportCasesForCustomerProfile(
  supabase: unknown,
  merchantId: string,
  customerProfileId: string
): Promise<PublicSupportCaseContext[]> {
  const client = supabase as FilterClient;
  const { data, error } = await (client.from(TABLES.SUPPORT_CASE_INTAKE) as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => {
          order: (col3: string, opts: { ascending: boolean }) => Promise<{
            data: Array<Record<string, unknown>> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .select(SAFE_CASE_COLUMNS)
    .eq('merchant_id', merchantId)
    .eq('customer_profile_id', customerProfileId)
    .order('updated_at_provider', { ascending: false });

  if (error) throw new Error(`list_support_cases_failed: ${error.message}`);
  const baseUrls = await fetchConnectionBaseUrls(supabase, merchantId);
  return (data ?? []).map((row) => toPublicSupportCase(row, baseUrls));
}

export async function listSupportCasesForMerchantClaim(
  supabase: unknown,
  merchantId: string,
  merchantClaimId: string
): Promise<PublicSupportCaseContext[]> {
  const client = supabase as FilterClient;
  const { data, error } = await (client.from(TABLES.SUPPORT_CASE_INTAKE) as {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => {
          order: (col3: string, opts: { ascending: boolean }) => Promise<{
            data: Array<Record<string, unknown>> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  })
    .select(SAFE_CASE_COLUMNS)
    .eq('merchant_id', merchantId)
    .eq('merchant_claim_id', merchantClaimId)
    .order('updated_at_provider', { ascending: false });

  if (error) throw new Error(`list_claim_support_cases_failed: ${error.message}`);
  const baseUrls = await fetchConnectionBaseUrls(supabase, merchantId);
  return (data ?? []).map((row) => toPublicSupportCase(row, baseUrls));
}

export async function listSupportCasesForClaimContext(
  supabase: unknown,
  merchantId: string,
  input: {
    merchantClaimId?: string | null;
    shopifyOrderId?: string | null;
    orderRef?: string | null;
    shopDomain?: string | null;
  }
): Promise<PublicSupportCaseContext[]> {
  if (input.merchantClaimId) {
    const linked = await listSupportCasesForMerchantClaim(
      supabase,
      merchantId,
      input.merchantClaimId
    );
    if (linked.length > 0) return linked;
  }

  const filters: string[] = [];
  if (input.shopifyOrderId) {
    filters.push(`shopify_order_id.eq.${input.shopifyOrderId}`);
  }
  if (input.orderRef) {
    filters.push(`order_ref.eq.${input.orderRef}`);
  }
  if (filters.length === 0) return [];

  const intakeQuery = (supabase as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (col: string, val: string) => {
          eq: (col2: string, val2: string) => {
            or: (filter: string) => {
              order: (
                col3: string,
                opts: { ascending: boolean }
              ) => Promise<{
                data: Array<Record<string, unknown>> | null;
                error: { message: string } | null;
              }>;
            };
          };
          or: (filter: string) => {
            order: (
              col3: string,
              opts: { ascending: boolean }
            ) => Promise<{
              data: Array<Record<string, unknown>> | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
  }).from(TABLES.SUPPORT_CASE_INTAKE);

  const { data, error } = input.shopDomain
    ? await intakeQuery
        .select(SAFE_CASE_COLUMNS)
        .eq('merchant_id', merchantId)
        .eq('shop_domain', input.shopDomain)
        .or(filters.join(','))
        .order('updated_at_provider', { ascending: false })
    : await intakeQuery
        .select(SAFE_CASE_COLUMNS)
        .eq('merchant_id', merchantId)
        .or(filters.join(','))
        .order('updated_at_provider', { ascending: false });

  if (error) throw new Error(`list_claim_context_support_cases_failed: ${error.message}`);

  const baseUrls = await fetchConnectionBaseUrls(supabase, merchantId);
  return (data ?? []).map((row) => toPublicSupportCase(row, baseUrls));
}
