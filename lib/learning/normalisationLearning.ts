/**
 * Normalisation learning loop.
 *
 * When a merchant confirms two orders are the same customer, any identifier
 * field where the orders had DIFFERENT normalised values is evidence the
 * normaliser missed a real-world equivalence. The reverse — confirmed
 * different customers whose normalised values matched — is evidence of an
 * over-aggressive normaliser.
 *
 * recordNormalisationDivergence() captures one such observation.
 *
 * analyseNormalisationLearning() surfaces the most common token-level
 * divergences in confirmed-same address pairs. The output is a report — it
 * does NOT auto-mutate the canonical normaliser. A developer reads the
 * report and decides which expansions to add.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface NormalisationLearningInsert {
  field_type: 'address' | 'name' | 'email' | 'phone';
  value_a: string;
  value_b: string;
  confirmed_same: boolean;
  similarity_at_time?: number | null;
  merchant_id?: string | null;
}

export async function recordNormalisationDivergence(
  supabase: SupabaseClient,
  obs: NormalisationLearningInsert
): Promise<void> {
  // Skip degenerate cases — same value isn't a learning signal.
  if (!obs.value_a || !obs.value_b) return;
  if (obs.value_a === obs.value_b) return;

  const { error } = await supabase
    .from('normalisation_learning')
    .insert(obs);
  if (error) {
    // Non-fatal: learning is a side channel, never fail the request.
    console.error(`[normalisationLearning] insert failed: ${error.message}`);
  }
}

/**
 * Token-pair frequencies in confirmed-same divergent pairs of a given field.
 * High-count pairs of one-token-vs-multi-token (e.g. "st" vs "street") are
 * candidate normaliser expansions.
 */
export interface DivergencePattern {
  tokenA: string;
  tokenB: string;
  count: number;
  exampleA: string;
  exampleB: string;
}

export async function analyseNormalisationLearning(
  supabase: SupabaseClient,
  fieldType: 'address' | 'name' | 'email' | 'phone' = 'address',
  limit: number = 25
): Promise<DivergencePattern[]> {
  const { data, error } = await supabase
    .from('normalisation_learning')
    .select('value_a, value_b')
    .eq('field_type', fieldType)
    .eq('confirmed_same', true)
    .limit(10000);
  if (error) throw new Error(`analyseNormalisationLearning: ${error.message}`);
  if (!data) return [];

  const pairCounts = new Map<string, DivergencePattern>();

  for (const row of data) {
    const tokensA = (row.value_a as string).split(/\s+/).filter(Boolean);
    const tokensB = (row.value_b as string).split(/\s+/).filter(Boolean);

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    // Tokens present in A but not B (and vice versa) are the divergence.
    const onlyA = tokensA.filter((t) => !setB.has(t));
    const onlyB = tokensB.filter((t) => !setA.has(t));

    // Pair up by position when counts match — covers the common
    // abbreviation/expansion case ("st" <-> "street") without trying to be
    // clever about word order.
    if (onlyA.length === onlyB.length && onlyA.length > 0) {
      for (let i = 0; i < onlyA.length; i++) {
        const a = onlyA[i].toLowerCase();
        const b = onlyB[i].toLowerCase();
        // Sort so "st"/"street" and "street"/"st" collapse to the same key.
        const [k1, k2] = a < b ? [a, b] : [b, a];
        const key = `${k1}|${k2}`;
        const existing = pairCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          pairCounts.set(key, {
            tokenA: k1,
            tokenB: k2,
            count: 1,
            exampleA: row.value_a as string,
            exampleB: row.value_b as string,
          });
        }
      }
    }
  }

  return Array.from(pairCounts.values())
    .sort((x, y) => y.count - x.count)
    .slice(0, limit);
}
