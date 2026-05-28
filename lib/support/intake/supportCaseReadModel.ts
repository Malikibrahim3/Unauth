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
  'id, provider, external_case_id, external_url, case_status, claim_reason, customer_message_summary, agent_notes_summary, tags, link_status, shopify_order_id, order_ref, link_metadata, merchant_claim_id, updated_at_provider';

function toPublicSupportCase(row: Record<string, unknown>): PublicSupportCaseContext {
  const linkMetadata =
    row.link_metadata && typeof row.link_metadata === 'object' && !Array.isArray(row.link_metadata)
      ? (row.link_metadata as Record<string, unknown>)
      : {};

  return {
    id: String(row.id),
    provider: String(row.provider),
    external_case_id: String(row.external_case_id),
    external_url: typeof row.external_url === 'string' ? row.external_url : null,
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
  return (data ?? []).map(toPublicSupportCase);
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
  return (data ?? []).map(toPublicSupportCase);
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

  const rows = (data ?? []).map(toPublicSupportCase);
  if (input.shopDomain) {
    return rows;
  }
  return rows;
}
