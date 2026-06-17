import { buildGorgiasClaimWidgetDataV2 } from '@/lib/gorgias/widgetDataV2';

type Resp = { data?: unknown; error?: unknown };

interface TableConfig {
  single?: Resp;
  list?: Resp;
  maybeSingle?: Resp;
}

function makeClient(config: Record<string, TableConfig>): any {
  return {
    from(table: string) {
      const cfg = config[table] ?? {};
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        ilike: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve(cfg.maybeSingle ?? cfg.single ?? { data: null, error: null }),
        then: (resolve: (v: Resp) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(cfg.list ?? { data: [], error: null }).then(resolve, reject),
      };
      return builder;
    },
    rpc: () =>
      Promise.resolve({
        data: [
          {
            identity_id: 'id-1',
            confidence_grade: 'probable',
            merchant_count: 4,
            total_orders: 10,
            total_claims: 5,
            claim_rate: 0.5,
            last_seen_at: '2026-06-10T00:00:00.000Z',
            claim_type_counts: { chargeback: 2, item_not_received: 1 },
          },
        ],
        error: null,
      }),
  };
}

const auth = { merchantId: 'm1', apiKeyId: 'k1', requestIp: null };

describe('buildGorgiasClaimWidgetDataV2 evidence threading', () => {
  it('includes cached evidence when k-anon disclosure returns an identity', async () => {
    const client = makeClient({
      source_orders: { list: { data: [{ id: 'o1', placed_at: '2026-05-01T00:00:00.000Z' }], error: null } },
      claims: { list: { data: [], error: null } },
      identity_evidence_scores: {
        maybeSingle: {
          data: {
            evidence_score: 62,
            evidence_level: 'substantial',
            has_sufficient_data: true,
            score_breakdown: [{ factor: 'network_claim_frequency', label: 'Claims', points: 18, max_points: 35, reason: 'x' }],
            scoring_config_version: 'evidence-v1',
          },
          error: null,
        },
      },
      merchant_identity_state: { list: { data: [{ identity_id: 'id-1' }], error: null } },
    });

    const { result } = await buildGorgiasClaimWidgetDataV2(client, auth, {
      rawEmail: 'shopper@example.com',
      rawName: 'Shopper',
      orderId: 'ord-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evidenceDisclosed).toBe(true);
    expect(result.data.evidenceScore).toBe(62);
    expect(result.data.evidenceLevel).toBe('substantial');
    expect(result.data.hasSufficientData).toBe(true);
    expect(result.data.scoringConfigVersion).toBe('evidence-v1');
    expect(result.data.claimTypes).toEqual(['item_not_received', 'chargeback']);
    expect(result.data.isNetworkFlagged).toBe(true);
  });

  it('withholds evidence when the k-anon RPC returns no identity', async () => {
    const client = {
      from(table: string) {
        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: () => builder,
          ilike: () => builder,
          in: () => builder,
          order: () => builder,
          limit: () => builder,
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          then: (resolve: (v: Resp) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
        };
        return builder;
      },
      rpc: () => Promise.resolve({ data: [], error: null }),
    };

    const { result } = await buildGorgiasClaimWidgetDataV2(client, auth, {
      rawEmail: 'shopper@example.com',
      rawName: 'Shopper',
      orderId: 'ord-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evidenceDisclosed).toBe(false);
    expect(result.data.evidenceScore).toBe(0);
    expect(result.data.network).toBeNull();
    expect(result.data.isNetworkFlagged).toBe(false);
  });
});
