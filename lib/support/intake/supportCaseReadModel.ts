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

// v2 source_tickets shape (post-cutover). Legacy intake columns
// (external_case_id, case_status, claim_reason, link_status, merchant_claim_id)
// no longer exist on the table; they are reconstructed in toPublicSupportCase.
const SAFE_TICKET_COLUMNS =
  'id, provider, external_id, external_url, status, subject, tags, linked_order_external_ids, connection_id, updated_at_provider, source_customer_id';

type TicketRow = Record<string, unknown>;

type QueryResult = Promise<{
  data: TicketRow[] | null;
  error: { message: string } | null;
}>;

type SingleResult = Promise<{
  data: TicketRow | null;
  error: { message: string } | null;
}>;

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

function firstLinkedOrderRef(row: TicketRow): string | null {
  const linked = row.linked_order_external_ids;
  if (Array.isArray(linked) && linked.length > 0 && typeof linked[0] === 'string') {
    return linked[0];
  }
  return null;
}

function toPublicSupportCase(
  row: TicketRow,
  baseUrlByConnection: Map<string, string>,
  merchantClaimId: string | null = null,
): PublicSupportCaseContext {
  const connectionId = typeof row.connection_id === 'string' ? row.connection_id : null;
  const baseUrl = connectionId ? baseUrlByConnection.get(connectionId) ?? null : null;
  const orderRef = firstLinkedOrderRef(row);

  return {
    id: String(row.id),
    provider: String(row.provider),
    external_case_id: String(row.external_id),
    external_url: toHumanHelpdeskUrl(String(row.provider), row.external_url, row.external_id, baseUrl),
    case_status: typeof row.status === 'string' ? row.status : null,
    claim_reason: null,
    customer_message_summary: typeof row.subject === 'string' ? row.subject : null,
    agent_notes_summary: null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    link_status: merchantClaimId || orderRef ? 'linked' : 'unlinked',
    shopify_order_id: null,
    order_ref: orderRef,
    claim_candidate: merchantClaimId != null,
    merchant_claim_id: merchantClaimId,
    updated_at_provider:
      typeof row.updated_at_provider === 'string' ? row.updated_at_provider : null,
  };
}

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

type TicketListClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (col: string, val: string) => {
        eq: (col2: string, val2: string) => {
          order: (col3: string, opts: { ascending: boolean }) => QueryResult;
          maybeSingle: () => SingleResult;
        };
        contains: (col2: string, val2: unknown[]) => {
          order: (col3: string, opts: { ascending: boolean }) => QueryResult;
        };
      };
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
  const client = supabase as TicketListClient;
  const { data, error } = await client
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select(SAFE_TICKET_COLUMNS)
    .eq('merchant_id', merchantId)
    .eq('source_customer_id', customerProfileId)
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
  const client = supabase as TicketListClient;

  // v2: the claim → ticket link lives on the payout case row.
  const { data: claim, error: claimError } = await client
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id, source_ticket_id')
    .eq('id', merchantClaimId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (claimError) throw new Error(`list_claim_support_cases_failed: ${claimError.message}`);
  const sourceTicketId =
    claim && typeof claim.source_ticket_id === 'string' ? claim.source_ticket_id : null;
  if (!sourceTicketId) return [];

  const { data, error } = await client
    .from(TABLES.SUPPORT_CASE_INTAKE)
    .select(SAFE_TICKET_COLUMNS)
    .eq('merchant_id', merchantId)
    .eq('id', sourceTicketId)
    .order('updated_at_provider', { ascending: false });

  if (error) throw new Error(`list_claim_support_cases_failed: ${error.message}`);
  const baseUrls = await fetchConnectionBaseUrls(supabase, merchantId);
  return (data ?? []).map((row) => toPublicSupportCase(row, baseUrls, merchantClaimId));
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

  // Fallback: tickets referencing the same order. v2 stores order references
  // (without a leading '#') in linked_order_external_ids.
  const refs = new Set<string>();
  if (input.orderRef) refs.add(input.orderRef.replace(/^#/, ''));
  if (input.shopifyOrderId) refs.add(String(input.shopifyOrderId));
  if (refs.size === 0) return [];

  const client = supabase as TicketListClient;
  const baseUrls = await fetchConnectionBaseUrls(supabase, merchantId);
  const byId = new Map<string, PublicSupportCaseContext>();

  for (const ref of refs) {
    const { data, error } = await client
      .from(TABLES.SUPPORT_CASE_INTAKE)
      .select(SAFE_TICKET_COLUMNS)
      .eq('merchant_id', merchantId)
      .contains('linked_order_external_ids', [ref])
      .order('updated_at_provider', { ascending: false });

    if (error) throw new Error(`list_claim_context_support_cases_failed: ${error.message}`);
    for (const row of data ?? []) {
      const mapped = toPublicSupportCase(row, baseUrls);
      byId.set(mapped.id, mapped);
    }
  }

  return [...byId.values()];
}
