type SourceCustomerLookupClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{
            data: { source_customer_id: string | null } | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };
  };
};

/** Resolve the merchant-owned source customer used by customer APIs. */
export async function resolveClaimSourceCustomerId(
  client: SourceCustomerLookupClient,
  merchantId: string,
  sourceOrderId: string | null,
): Promise<string | null> {
  if (!sourceOrderId) return null;

  const { data, error } = await client
    .from('source_orders')
    .select('source_customer_id')
    .eq('id', sourceOrderId)
    .eq('merchant_id', merchantId)
    .maybeSingle();

  if (error) return null;
  return data?.source_customer_id ?? null;
}
