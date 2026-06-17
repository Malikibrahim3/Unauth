/**
 * v2 identity resolution engine — SINGLE SOURCE OF TRUTH.
 *
 * Incremental form of the Phase 4 cutover algorithm that populated the live
 * identities/identity_members/identity_profiles tables:
 *   - strong identifier observations union via co-occurrence edges
 *     (union-find over identity_edges; weak types ip/name never claim
 *     membership — they bridge as edge weight only)
 *   - identity confidence = Σ V2_IDENTIFIER_TYPE_WEIGHTS over the cluster's
 *     DISTINCT member types, + SIGNAL_WEIGHTS.crossMerchant when the cluster
 *     spans ≥ 2 merchants, capped at 100
 *   - grade via canonical scoreToGrade (CONFIDENCE_THRESHOLDS 85/65/45)
 *   - merges set superseded_by lineage and append 'merged' resolution events
 *
 * Callers: every ingestion path, immediately after emitIdentityObservations,
 * passing the returned signalKeys as seeds. Do not implement scoring or
 * clustering anywhere else (CLAUDE.md SSOT rules).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SIGNAL_WEIGHTS, V2_IDENTIFIER_TYPE_WEIGHTS, scoreToGrade } from '@/lib/engine/weights';
import { STRONG_IDENTIFIER_TYPES, type IdentitySignal } from '@/lib/identity/observations';

type Client = SupabaseClient<any>;
const key = (t: string, h: string) => `${t}|${h}`;
const unkey = (k: string) => {
  const i = k.indexOf('|');
  return { type: k.slice(0, i), hash: k.slice(i + 1) };
};

const MAX_EXPANSION_ROUNDS = 10;
const CHUNK = 80;

function chunked<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export type ResolveSummary = { created: number; updated: number; merged: number; identityIds: string[] };

export async function resolveIdentitiesForKeys(
  client: Client,
  seedKeys: IdentitySignal[],
  actor = 'engine'
): Promise<ResolveSummary> {
  const strongSeeds = seedKeys.filter((s) => STRONG_IDENTIFIER_TYPES.has(s.type));
  if (strongSeeds.length === 0) return { created: 0, updated: 0, merged: 0, identityIds: [] };

  // ── 1. expand connected component(s) via strong-strong co-occurrence edges
  const known = new Map<string, IdentitySignal>(strongSeeds.map((s) => [key(s.type, s.hash), s]));
  const compEdges: Array<{ a: string; b: string }> = [];
  let frontier = [...known.keys()];
  for (let round = 0; round < MAX_EXPANSION_ROUNDS && frontier.length > 0; round++) {
    const hashes = [...new Set(frontier.map((k) => unkey(k).hash))];
    const next: string[] = [];
    for (const hs of chunked(hashes)) {
      for (const side of ['left_hash', 'right_hash'] as const) {
        const { data, error } = await client
          .from('identity_edges')
          .select('left_type, left_hash, right_type, right_hash')
          .in(side, hs);
        if (error) throw new Error(`resolver edge expansion failed: ${error.message}`);
        for (const e of data ?? []) {
          if (!STRONG_IDENTIFIER_TYPES.has(e.left_type) || !STRONG_IDENTIFIER_TYPES.has(e.right_type)) continue;
          const ka = key(e.left_type, e.left_hash), kb = key(e.right_type, e.right_hash);
          if (!known.has(ka) && !known.has(kb)) continue; // hash-only match on a foreign type
          compEdges.push({ a: ka, b: kb });
          for (const kx of [ka, kb]) {
            if (!known.has(kx)) {
              known.set(kx, unkey(kx) as IdentitySignal);
              next.push(kx);
            }
          }
        }
      }
    }
    frontier = next;
  }

  // ── 2. union-find into components
  const parent = new Map<string, string>([...known.keys()].map((k) => [k, k]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    let c = x;
    while (parent.get(c) !== c) { const n = parent.get(c)!; parent.set(c, r); c = n; }
    return r;
  };
  for (const { a, b } of compEdges) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  const components = new Map<string, string[]>();
  for (const k0 of parent.keys()) {
    const r = find(k0);
    if (!components.has(r)) components.set(r, []);
    components.get(r)!.push(k0);
  }

  // ── 3. fetch signal stats for all component keys (network-wide)
  const allKeys = [...known.keys()];
  type Stat = { merchants: Set<string>; count: number; orders: Set<string>; fs: string | null; ls: string | null };
  const stats = new Map<string, Stat>();
  for (const hs of chunked([...new Set(allKeys.map((k) => unkey(k).hash))])) {
    const { data, error } = await client
      .from('identity_signals')
      .select('identifier_type, identifier_hash, merchant_id, source_order_id, observed_at')
      .in('identifier_hash', hs);
    if (error) throw new Error(`resolver signal fetch failed: ${error.message}`);
    for (const s of data ?? []) {
      const k0 = key(s.identifier_type, s.identifier_hash);
      if (!known.has(k0)) continue;
      let st = stats.get(k0);
      if (!st) { st = { merchants: new Set(), count: 0, orders: new Set(), fs: null, ls: null }; stats.set(k0, st); }
      st.merchants.add(s.merchant_id);
      st.count++;
      if (s.source_order_id) st.orders.add(s.source_order_id);
      if (!st.fs || s.observed_at < st.fs) st.fs = s.observed_at;
      if (!st.ls || s.observed_at > st.ls) st.ls = s.observed_at;
    }
  }

  // ── 4. existing memberships
  const owners = new Map<string, string>(); // key -> identity_id
  for (const hs of chunked([...new Set(allKeys.map((k) => unkey(k).hash))])) {
    const { data, error } = await client
      .from('identity_members')
      .select('identity_id, identifier_type, identifier_hash')
      .in('identifier_hash', hs);
    if (error) throw new Error(`resolver member fetch failed: ${error.message}`);
    for (const m of data ?? []) {
      const k0 = key(m.identifier_type, m.identifier_hash);
      if (known.has(k0)) owners.set(k0, m.identity_id);
    }
  }

  // ── 5. process each component
  const summary: ResolveSummary = { created: 0, updated: 0, merged: 0, identityIds: [] };
  const now = new Date().toISOString();

  for (const memberKeys of components.values()) {
    const types = new Set(memberKeys.map((k) => unkey(k).type));
    const merchants = new Set<string>();
    const orderIds = new Set<string>();
    let signalCount = 0;
    let fs: string | null = null, ls: string | null = null;
    for (const k0 of memberKeys) {
      const st = stats.get(k0);
      if (!st) continue;
      st.merchants.forEach((m) => merchants.add(m));
      st.orders.forEach((o) => orderIds.add(o));
      signalCount += st.count;
      if (st.fs && (!fs || st.fs < fs)) fs = st.fs;
      if (st.ls && (!ls || st.ls > ls)) ls = st.ls;
    }
    let base = 0;
    for (const t of types) base += V2_IDENTIFIER_TYPE_WEIGHTS[t] ?? 0;
    const score = Math.min(base + (merchants.size >= 2 ? SIGNAL_WEIGHTS.crossMerchant : 0), 100);
    const grade = scoreToGrade(score);

    const ownerIds = [...new Set(memberKeys.map((k) => owners.get(k)).filter(Boolean))] as string[];
    let identityId: string;

    if (ownerIds.length === 0) {
      const { data, error } = await client.from('identities').insert({
        confidence_grade: grade, confidence_score: score,
        merchant_count: merchants.size, signal_count: signalCount,
        first_seen_at: fs ?? now, last_seen_at: ls ?? now,
      }).select('id').single();
      if (error) throw new Error(`resolver identity insert failed: ${error.message}`);
      identityId = data.id;
      const { error: me } = await client.from('identity_members').insert(memberKeys.map((k0) => ({
        identity_id: identityId, ...memberToRow(k0),
      })));
      if (me) throw new Error(`resolver member insert failed: ${me.message}`);
      await appendEvent(client, identityId, 'created', { to_grade: grade, detail: { score, merchant_count: merchants.size, signal_count: signalCount }, actor });
      summary.created++;
    } else {
      const { data: ids, error } = await client.from('identities')
        .select('id, confidence_score, confidence_grade, created_at').in('id', ownerIds);
      if (error) throw new Error(`resolver owner fetch failed: ${error.message}`);
      ids!.sort((a: any, b: any) =>
        (Number(b.confidence_score) - Number(a.confidence_score)) || String(a.created_at).localeCompare(String(b.created_at)));
      const winner = ids![0];
      identityId = winner.id;
      for (const loser of ids!.slice(1)) {
        const { error: m1 } = await client.from('identity_members')
          .update({ identity_id: identityId }).eq('identity_id', loser.id);
        if (m1) throw new Error(`resolver member move failed: ${m1.message}`);
        const { error: m2 } = await client.from('identities')
          .update({ superseded_by: identityId }).eq('id', loser.id);
        if (m2) throw new Error(`resolver supersede failed: ${m2.message}`);
        await appendEvent(client, loser.id, 'merged', {
          from_grade: loser.confidence_grade, to_grade: grade,
          detail: { merged_into: identityId }, actor,
        });
        summary.merged++;
      }
      const ownedKeys = new Set([...owners.entries()].filter(([, v]) => ownerIds.includes(v)).map(([k0]) => k0));
      const newKeys = memberKeys.filter((k0) => !ownedKeys.has(k0));
      if (newKeys.length > 0) {
        const { error: m3 } = await client.from('identity_members')
          .upsert(newKeys.map((k0) => ({ identity_id: identityId, ...memberToRow(k0) })), { ignoreDuplicates: true });
        if (m3) throw new Error(`resolver member add failed: ${m3.message}`);
        await appendEvent(client, identityId, 'member_added', { detail: { added: newKeys.length }, actor });
      }
      const { error: m4 } = await client.from('identities').update({
        confidence_grade: grade, confidence_score: score,
        merchant_count: merchants.size, signal_count: signalCount,
        first_seen_at: fs ?? now, last_seen_at: ls ?? now,
      }).eq('id', identityId);
      if (m4) throw new Error(`resolver identity update failed: ${m4.message}`);
      if (winner.confidence_grade !== grade) {
        await appendEvent(client, identityId, 'grade_changed', {
          from_grade: winner.confidence_grade, to_grade: grade, detail: { score }, actor,
        });
      }
      summary.updated++;
    }
    summary.identityIds.push(identityId);

    // claims on this component's orders that are not yet linked
    if (orderIds.size > 0) {
      const { error: cl } = await client.from('claims')
        .update({ identity_id: identityId })
        .in('source_order_id', [...orderIds]).is('identity_id', null);
      if (cl) throw new Error(`resolver claim link failed: ${cl.message}`);
    }

    await refreshIdentityProfile(client, identityId, {
      orderIds: [...orderIds], merchantCount: merchants.size, fs, ls,
    });
  }

  return summary;
}

function memberToRow(k0: string) {
  const { type, hash } = unkey(k0);
  return {
    identifier_type: type, identifier_hash: hash,
    match_confidence: 95, matched_via: ['co_occurrence'],
  };
}

async function appendEvent(
  client: Client, identityId: string, eventType: string,
  opts: { from_grade?: string; to_grade?: string; detail?: Record<string, unknown>; actor: string }
) {
  const { error } = await client.from('identity_resolution_events').insert({
    identity_id: identityId, event_type: eventType,
    from_grade: opts.from_grade ?? null, to_grade: opts.to_grade ?? null,
    detail: opts.detail ?? {}, actor: opts.actor,
  });
  if (error) throw new Error(`resolver event append failed: ${error.message}`);
}

/**
 * Links a claim to the identity reachable from its order's signals (if any)
 * and refreshes that identity's behavioural profile. Used by ingestion paths
 * that create claims without emitting new identity signals (e.g. disputes).
 */
export async function linkClaimToIdentity(
  client: Client, claimId: string, sourceOrderId: string
): Promise<string | null> {
  const { data: sigs, error } = await client.from('identity_signals')
    .select('identifier_type, identifier_hash').eq('source_order_id', sourceOrderId);
  if (error) throw new Error(`claim link signal fetch failed: ${error.message}`);
  const strong = (sigs ?? []).filter((s) => STRONG_IDENTIFIER_TYPES.has(s.identifier_type));
  if (strong.length === 0) return null;
  let identityId: string | null = null;
  for (const s of strong) {
    const { data: m } = await client.from('identity_members')
      .select('identity_id').eq('identifier_type', s.identifier_type)
      .eq('identifier_hash', s.identifier_hash).limit(1).maybeSingle();
    if (m?.identity_id) { identityId = m.identity_id; break; }
  }
  if (!identityId) return null;
  const { error: ue } = await client.from('claims')
    .update({ identity_id: identityId }).eq('id', claimId).is('identity_id', null);
  if (ue) throw new Error(`claim link update failed: ${ue.message}`);
  // recompute the profile with the identity's full order set
  const { data: members } = await client.from('identity_members')
    .select('identifier_type, identifier_hash').eq('identity_id', identityId);
  const orderIds = new Set<string>();
  const merchantsSet = new Set<string>();
  let fs: string | null = null, ls: string | null = null;
  for (const ms of chunked(members ?? [])) {
    const { data: sg } = await client.from('identity_signals')
      .select('identifier_type, identifier_hash, merchant_id, source_order_id, observed_at')
      .in('identifier_hash', ms.map((m: any) => m.identifier_hash));
    const want = new Set(ms.map((m: any) => key(m.identifier_type, m.identifier_hash)));
    for (const s of sg ?? []) {
      if (!want.has(key(s.identifier_type, s.identifier_hash))) continue;
      if (s.source_order_id) orderIds.add(s.source_order_id);
      merchantsSet.add(s.merchant_id);
      if (!fs || s.observed_at < fs) fs = s.observed_at;
      if (!ls || s.observed_at > ls) ls = s.observed_at;
    }
  }
  await refreshIdentityProfile(client, identityId, {
    orderIds: [...orderIds], merchantCount: merchantsSet.size, fs, ls,
  });
  return identityId;
}

/** Phase-4-equivalent behavioural rollup for one identity. */
export async function refreshIdentityProfile(
  client: Client, identityId: string,
  ctx: { orderIds: string[]; merchantCount: number; fs: string | null; ls: string | null }
) {
  const { data: claimRows, error } = await client.from('claims')
    .select('claim_type, source_order_id, submitted_at').eq('identity_id', identityId);
  if (error) throw new Error(`resolver profile claims fetch failed: ${error.message}`);

  let refundAmount = 0;
  if (ctx.orderIds.length > 0) {
    for (const ids of chunked(ctx.orderIds)) {
      const { data: refunds, error: re } = await client.from('source_refunds')
        .select('amount').in('source_order_id', ids);
      if (re) throw new Error(`resolver refunds fetch failed: ${re.message}`);
      for (const r of refunds ?? []) refundAmount += Number(r.amount ?? 0);
    }
  }

  const claims = claimRows ?? [];
  const typeCounts: Record<string, number> = {};
  for (const c of claims) typeCounts[c.claim_type] = (typeCounts[c.claim_type] ?? 0) + 1;
  let fastest: number | null = null, avgSum = 0, avgN = 0;
  if (claims.length > 0) {
    const orderIdsWithClaims = [...new Set(claims.map((c: any) => c.source_order_id).filter(Boolean))];
    const placedById = new Map<string, string>();
    for (const ids of chunked(orderIdsWithClaims)) {
      const { data: ords } = await client.from('source_orders').select('id, placed_at').in('id', ids);
      for (const o of ords ?? []) if (o.placed_at) placedById.set(o.id, o.placed_at);
    }
    for (const c of claims) {
      const placed = c.source_order_id ? placedById.get(c.source_order_id) : undefined;
      if (placed && c.submitted_at >= placed) {
        const days = (new Date(c.submitted_at).getTime() - new Date(placed).getTime()) / 86400e3;
        fastest = fastest === null ? days : Math.min(fastest, days);
        avgSum += days; avgN++;
      }
    }
  }

  const { error: pe } = await client.from('identity_profiles').upsert({
    identity_id: identityId,
    total_orders: ctx.orderIds.length,
    total_claims: claims.length,
    total_chargebacks: claims.filter((c: any) => c.claim_type === 'chargeback').length,
    total_refund_amount: Number(refundAmount.toFixed(2)),
    claim_rate: ctx.orderIds.length > 0 ? Number((claims.length / ctx.orderIds.length).toFixed(4)) : null,
    fastest_claim_days: fastest === null ? null : Number(fastest.toFixed(2)),
    avg_claim_days: avgN > 0 ? Number((avgSum / avgN).toFixed(2)) : null,
    claim_type_counts: typeCounts,
    merchant_count: ctx.merchantCount,
    first_seen_at: ctx.fs, last_seen_at: ctx.ls,
    refreshed_at: new Date().toISOString(),
  });
  if (pe) throw new Error(`resolver profile upsert failed: ${pe.message}`);

  // Refresh the cached evidence score alongside the behavioural rollup, so the
  // two stay consistent without a separate DB webhook. Strictly non-fatal: a
  // scoring failure must never break identity resolution. Dynamic import keeps
  // the evidence module out of the resolver's static graph.
  try {
    const { recomputeIdentityEvidenceScore } = await import('@/lib/engine/evidence/recompute');
    const result = await recomputeIdentityEvidenceScore(identityId, { client });
    if (!result.ok) {
      console.error(`[resolver] evidence recompute failed for ${identityId}: ${result.error}`);
    }
  } catch (err) {
    console.error(
      `[resolver] evidence recompute threw for ${identityId}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
