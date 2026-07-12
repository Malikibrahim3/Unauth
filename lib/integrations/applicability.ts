import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApplicableIntegrationCategory,
  CategoryApplicabilityStatus,
  CategoryApplicabilityView,
  IntegrationProvider,
} from '@/lib/integrations/types';
import { TABLES } from '@/lib/supabase/tables';

export const APPLICABILITY_CATEGORIES: ApplicableIntegrationCategory[] = ['warehouse_3pl', 'returns'];

export type CategoryApplicabilityMap = Record<ApplicableIntegrationCategory, CategoryApplicabilityStatus>;

export function defaultCategoryApplicability(): CategoryApplicabilityMap {
  return {
    warehouse_3pl: 'applicable',
    returns: 'applicable',
  };
}

export async function getCategoryApplicabilityViews(
  client: SupabaseClient,
  merchantId: string,
): Promise<CategoryApplicabilityView[]> {
  const { data, error } = await client
    .from(TABLES.CATEGORY_APPLICABILITY)
    .select('category,status,set_by,set_at')
    .eq('merchant_id', merchantId)
    .in('category', APPLICABILITY_CATEGORIES);
  if (error) throw new Error(`category_applicability_lookup_failed: ${error.message}`);

  const rowByCategory = new Map(
    ((data ?? []) as any[]).map((row) => [row.category as ApplicableIntegrationCategory, row]),
  );

  return APPLICABILITY_CATEGORIES.map((category) => {
    const row = rowByCategory.get(category);
    return {
      category,
      status: row?.status === 'not_applicable' ? 'not_applicable' : 'applicable',
      setBy: row?.set_by ?? null,
      setAt: row?.set_at ?? null,
    };
  });
}

export async function getCategoryApplicabilityMap(
  client: SupabaseClient,
  merchantId: string,
): Promise<CategoryApplicabilityMap> {
  const views = await getCategoryApplicabilityViews(client, merchantId);
  return views.reduce((acc, view) => {
    acc[view.category] = view.status;
    return acc;
  }, defaultCategoryApplicability());
}

export function providerAppliesToMerchant(
  provider: IntegrationProvider,
  applicability: CategoryApplicabilityMap,
): boolean {
  if (provider.id === 'self_fulfillment_pack') {
    return applicability.warehouse_3pl === 'not_applicable';
  }
  if (provider.category === 'warehouse_3pl' && applicability.warehouse_3pl === 'not_applicable') {
    return false;
  }
  if (provider.category === 'returns' && applicability.returns === 'not_applicable') {
    return false;
  }
  return true;
}

export async function setCategoryApplicability(input: {
  client: SupabaseClient;
  merchantId: string;
  category: ApplicableIntegrationCategory;
  status: CategoryApplicabilityStatus;
  setBy: string;
}): Promise<void> {
  const { error } = await input.client
    .from(TABLES.CATEGORY_APPLICABILITY)
    .upsert({
      merchant_id: input.merchantId,
      category: input.category,
      status: input.status,
      set_by: input.setBy,
      set_at: new Date().toISOString(),
    }, { onConflict: 'merchant_id,category' });
  if (error) throw new Error(`category_applicability_upsert_failed: ${error.message}`);
}
