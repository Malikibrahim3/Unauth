import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import type { ScoredOrder } from '@/lib/engine/types';
import {
  normaliseAddress,
  normaliseCard,
  normaliseEmail,
  normaliseIP,
} from '@/lib/identity/normalise';

type ServiceClient = SupabaseClient<Database>;
type Grade = 'weak' | 'possible' | 'probable' | 'definite';

export type GlobalIdentitySummary = {
  attributesUpserted: number;
  appearancesInserted: number;
  crossMerchantAttributes: number;
  gradeCounts: Record<Grade, number>;
  errors: string[];
};

type IdentityResultSummary = {
  grade: Grade | null;
  signals: string[];
};

type AttributeInput = {
  type: 'email' | 'phone' | 'address' | 'ip' | 'device' | 'card_last4';
  value: string;
  orderId: string;
  transactionId: string | null;
  grade: Grade;
  matchedSignalCount: number;
};

const GRADE_RANK: Record<Grade, number> = {
  weak: 1,
  possible: 2,
  probable: 3,
  definite: 4,
};

function strongerGrade(a: Grade, b: Grade): Grade {
  return GRADE_RANK[b] > GRADE_RANK[a] ? b : a;
}

function gradeFromIdentity(identity: IdentityResultSummary | undefined): Grade {
  return identity?.grade ?? 'weak';
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function raw(order: ScoredOrder['order']) {
  return order as ScoredOrder['order'] & {
    _rawEmail?: string | null;
    _rawPhone?: string | null;
    _rawAddress?: string | null;
    _rawIP?: string | null;
    _rawCardLast4?: string | null;
    deviceIdHash?: string | null;
  };
}

function attributesForOrder(
  scoredOrder: ScoredOrder,
  transactionId: string | null,
  identity: IdentityResultSummary | undefined
): AttributeInput[] {
  const order = raw(scoredOrder.order);
  const grade = gradeFromIdentity(identity);
  const matchedSignalCount = Math.max(identity?.signals.length ?? 0, 1);
  const attrs: AttributeInput[] = [];
  const email = normaliseEmail(order._rawEmail);
  const phone = (order._rawPhone ?? '').replace(/[^\d+]/g, '').trim();
  const address = normaliseAddress(order._rawAddress);
  const ip = normaliseIP(order._rawIP);
  const card = normaliseCard(order._rawCardLast4);
  const device = order.deviceIdHash ?? null;

  if (email) attrs.push({ type: 'email', value: email, orderId: order.orderId, transactionId, grade, matchedSignalCount });
  if (phone) attrs.push({ type: 'phone', value: phone, orderId: order.orderId, transactionId, grade, matchedSignalCount });
  if (address) attrs.push({ type: 'address', value: address, orderId: order.orderId, transactionId, grade, matchedSignalCount });
  if (ip) attrs.push({ type: 'ip', value: ip, orderId: order.orderId, transactionId, grade, matchedSignalCount });
  if (device) attrs.push({ type: 'device', value: device, orderId: order.orderId, transactionId, grade, matchedSignalCount });
  if (card && card.length === 4) attrs.push({ type: 'card_last4', value: card, orderId: order.orderId, transactionId, grade, matchedSignalCount });
  return attrs;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export async function persistGlobalIdentityGraph({
  scored,
  merchantId,
  auditId,
  transactionIdMap,
  serviceClient,
  identityByOrder,
}: {
  scored: ScoredOrder[];
  merchantId: string;
  auditId: string;
  transactionIdMap: Map<string, string>;
  serviceClient: ServiceClient;
  identityByOrder: Map<string, IdentityResultSummary>;
}): Promise<GlobalIdentitySummary> {
  const errors: string[] = [];
  const gradeCounts: Record<Grade, number> = { weak: 0, possible: 0, probable: 0, definite: 0 };
  const attrs = scored.flatMap((order) =>
    attributesForOrder(
      order,
      transactionIdMap.get(order.order.orderId) ?? null,
      identityByOrder.get(order.order.orderId)
    )
  );
  if (attrs.length === 0) {
    return { attributesUpserted: 0, appearancesInserted: 0, crossMerchantAttributes: 0, gradeCounts, errors };
  }

  const keys = unique(attrs.map((a) => `${a.type}:${a.value}`));
  const aggregate = new Map<string, AttributeInput & { orderIds: string[]; transactionIds: string[]; grade: Grade }>();
  for (const attr of attrs) {
    const key = `${attr.type}:${attr.value}`;
    const current = aggregate.get(key);
    if (!current) {
      aggregate.set(key, { ...attr, orderIds: [attr.orderId], transactionIds: attr.transactionId ? [attr.transactionId] : [] });
    } else {
      current.orderIds.push(attr.orderId);
      if (attr.transactionId) current.transactionIds.push(attr.transactionId);
      current.grade = strongerGrade(current.grade, attr.grade);
      current.matchedSignalCount = Math.max(current.matchedSignalCount, attr.matchedSignalCount);
    }
  }

  const existingRows: Array<{
    id: string;
    attribute_type: AttributeInput['type'];
    attribute_value: string;
    merchant_ids: string[] | null;
    audit_ids: string[] | null;
    appearance_count: number | null;
    confidence_grade: Grade | null;
  }> = [];

  const lookupChunks = (['email', 'phone', 'address', 'ip', 'device', 'card_last4'] as const).flatMap((type) => {
    const values = [...aggregate.values()].flatMap((attr) => (attr.type === type ? [attr.value] : []));
    return chunk(values, 200).map((valueChunk) => ({ type, valueChunk }));
  });
  const lookupResults = await Promise.all(
    lookupChunks.map(async ({ type, valueChunk }) => {
      const { data, error } = await (serviceClient as any)
        .from('global_identity_attributes')
        .select('id,attribute_type,attribute_value,merchant_ids,audit_ids,appearance_count,confidence_grade')
        .eq('attribute_type', type)
        .in('attribute_value', valueChunk);
      if (error) {
        errors.push(`Global identity lookup failed: ${error.message}`);
        return [] as typeof existingRows;
      }
      return (data ?? []) as typeof existingRows;
    })
  );
  existingRows.push(...lookupResults.flat());

  const existingByKey = new Map(existingRows.map((row) => [`${row.attribute_type}:${row.attribute_value}`, row]));
  const upserts = [...aggregate.values()].map((attr) => {
    const existing = existingByKey.get(`${attr.type}:${attr.value}`);
    const merchantIds = unique([...(existing?.merchant_ids ?? []), merchantId]);
    const auditIds = unique([...(existing?.audit_ids ?? []), auditId]);
    const confidence = strongerGrade(existing?.confidence_grade ?? 'weak', attr.grade);
    gradeCounts[confidence] += 1;
    return {
      ...(existing?.id ? { id: existing.id } : {}),
      attribute_type: attr.type,
      attribute_value: attr.value,
      merchant_ids: merchantIds,
      audit_ids: auditIds,
      appearance_count: (existing?.appearance_count ?? 0) + attr.orderIds.length,
      cross_merchant_count: merchantIds.length,
      confidence_grade: confidence,
      last_seen_at: new Date().toISOString(),
    };
  });

  const upsertBatches = await Promise.all(
    chunk(upserts, 1000).map(async (rows) => {
      const { data, error } = await (serviceClient as any)
        .from('global_identity_attributes')
        .upsert(rows, { onConflict: 'attribute_type,attribute_value' })
        .select('id,attribute_type,attribute_value,merchant_ids');
      if (error) {
        errors.push(`Global identity upsert failed: ${error.message}`);
        return [] as Array<{ id: string; attribute_type: AttributeInput['type']; attribute_value: string; merchant_ids: string[] }>;
      }
      return (data ?? []) as Array<{ id: string; attribute_type: AttributeInput['type']; attribute_value: string; merchant_ids: string[] }>;
    })
  );
  const attributeRows = upsertBatches.flat();

  const idByKey = new Map(attributeRows.map((row) => [`${row.attribute_type}:${row.attribute_value}`, row.id]));
  const appearances = attrs
    .flatMap((attr) => {
      const attributeId = idByKey.get(`${attr.type}:${attr.value}`);
      if (!attributeId) return [];
      return [{
        attribute_id: attributeId,
        merchant_id: merchantId,
        audit_id: auditId,
        transaction_id: attr.transactionId,
        order_id: attr.orderId,
        confidence_grade: attr.grade,
        matched_signal_count: attr.matchedSignalCount,
      }];
    });

  const appearanceResults = await Promise.all(
    chunk(appearances, 1000).map(async (rows) => {
      const { error } = await (serviceClient as any)
        .from('global_identity_appearances')
        .upsert(rows, { onConflict: 'attribute_id,merchant_id,audit_id,order_id', ignoreDuplicates: true });
      if (error) {
        errors.push(`Global identity appearance insert failed: ${error.message}`);
        return 0;
      }
      return rows.length;
    })
  );
  const appearancesInserted = appearanceResults.reduce((sum, count) => sum + count, 0);

  const crossMerchantAttributes = attributeRows.filter((row) => (row.merchant_ids ?? []).length > 1).length;
  return {
    attributesUpserted: attributeRows.length,
    appearancesInserted,
    crossMerchantAttributes,
    gradeCounts,
    errors,
  };
}
