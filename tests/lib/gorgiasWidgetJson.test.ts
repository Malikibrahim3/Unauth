import {
  claimWidgetToJson,
  formatClaimRecommendationUnavailable,
  formatEvidenceBreakdown,
  formatEvidenceSummary,
  formatNoPayoutCaseFields,
} from '@/lib/gorgias/widgetJson';
import { WITHHELD_EVIDENCE_SIGNALS } from '@/lib/gorgias/widgetData';

const OK_RESULT = {
  ok: true as const,
  data: {
    confidenceGrade: 'definite' as const,
    matchedOn: ['email', 'device'],
    ce3EvidenceAvailable: true,
    thisStore: {
      orderCount: 3,
      claimCount: 2,
      claimRate: 2 / 3,
      ordersCountSource: 'transactions' as const,
      lastClaimAt: '2026-05-01T00:00:00.000Z',
    },
    network: {
      orderCount: 12,
      claimCount: 9,
      merchantCount: 4,
      claimRate: 0.75,
      recentClaimCount: 3,
      primaryReason: { type: 'dominant' as const, label: 'Item not received', percentage: 75 },
    },
    storeClaimValue: 120,
    storePrimaryReason: { type: 'dominant' as const, label: 'Item not received', percentage: 75 },
    storeRecentClaimCount: 1,
    profileUrl: 'https://app.unauth.test/customers',
    dataFreshAt: '2026-06-17T00:00:00.000Z',
    watchlisted: false,
    ...WITHHELD_EVIDENCE_SIGNALS,
    claimTypes: [],
  },
};

describe('claimWidgetToJson', () => {
  it('formats full network context when showNetworkIntelligence is enabled', () => {
    const payload = claimWidgetToJson(OK_RESULT, undefined, { showNetworkIntelligence: true });

    expect(payload.orders).toBe('3 orders here · 12 across 4 merchants');
    expect(payload.claim_rate).toBe('67% this store · 75% network');
    expect(payload.primary_reason).toBe('Item not received · 75%');
    expect(payload.recent_activity).toBe('3 claims in last 90 days');
    expect(payload.identity).toContain('DEFINITE');
    for (const [key, value] of Object.entries(payload)) {
      expect(typeof value).toBe('string');
      if (!key.endsWith('_url')) {
        expect(value).not.toBe('');
      }
    }
  });

  it('shows own-store data without network by default (free tier)', () => {
    const payload = claimWidgetToJson(OK_RESULT);

    expect(payload.orders).toBe('3 orders here · No network history found');
    expect(payload.claim_rate).toBe('67% this store');
    expect(payload.identity).toContain('DEFINITE');
    expect(payload.claims).toContain('your store');
    for (const [key, value] of Object.entries(payload)) {
      expect(typeof value).toBe('string');
    }
  });

  it('trust summary for repeat-claim customer includes last claim timing', () => {
    // OK_RESULT: claimRate=0.67, claimCount=2 → additional_review; lastClaimAt='2026-05-01'
    const payload = claimWidgetToJson(OK_RESULT);
    expect(payload.watchlisted).toContain('Additional review recommended');
    expect(payload.watchlisted).toMatch(/last .+ ago/);
  });

  it('recent_activity includes claim type for single recent store claim', () => {
    const result = {
      ...OK_RESULT,
      data: {
        ...OK_RESULT.data,
        storeRecentClaimCount: 1,
        storePrimaryReason: { type: 'dominant' as const, label: 'Item not received', percentage: 75 },
      },
    };
    // showNetworkIntelligence disabled → own-store recent_activity
    const payload = claimWidgetToJson(result);
    expect(payload.recent_activity).toContain('Item not received');
    expect(payload.recent_activity).toContain('1 claim in last 90 days');
  });

  it('keeps refund requests separate from completed refunds in store context', () => {
    const payload = claimWidgetToJson({
      ...OK_RESULT,
      data: {
        ...OK_RESULT.data,
        refundRequestCount365d: 12,
        completedRefundCount365d: 3,
      },
    });
    expect(payload.claims).toContain('12 refund requests in last 365 days');
    expect(payload.claims).toContain('3 completed refunds in last 365 days');
    expect(payload.context_summary).toContain('12 refund requests in last 365 days');
  });

  it('not_found renders a factual fallback', () => {
    const payload = claimWidgetToJson({ ok: false, kind: 'not_found' });

    expect(payload.orders).toBe('No orders synced yet');
    expect(payload.claim_rate).toBe('—');
    expect(payload.primary_reason).toBe('—');
    expect(payload.recent_activity).toBe('—');
  });

  it('never returns null fields for current widget payloads', () => {
    const payload = claimWidgetToJson({ ok: false, kind: 'not_found' });
    expect(Object.values(payload).every((v) => typeof v === 'string')).toBe(true);
  });

  it('uses a neutral no-case payout card instead of identity fallback recommendations', () => {
    expect(formatNoPayoutCaseFields()).toEqual({
      payout_exposure: 'Case: No payout case detected for this ticket yet',
      evidence_checklist: 'Evidence: —',
      recommendation: 'Rule: —',
      recovery_path: 'Recovery: —',
    });
    expect(formatClaimRecommendationUnavailable('not_found').recommendation_detail).toContain(
      'No payout case detected',
    );
    expect(formatClaimRecommendationUnavailable('not_found').recommendation_detail).not.toContain(
      'identity context',
    );
  });

  it('includes evidence display fields on successful payloads', () => {
    const data = {
      ...OK_RESULT.data,
      evidenceDisclosed: true,
      evidenceScore: 62,
      evidenceLevel: 'substantial' as const,
      hasSufficientData: true,
      scoreBreakdown: [
        { factor: 'network_claim_frequency', label: 'Claims across the network', points: 18, max_points: 35, reason: 'x' },
      ],
      scoringConfigVersion: 'evidence-v1',
      claimTypes: ['chargeback'],
      isNetworkFlagged: false,
    };
    const payload = claimWidgetToJson({ ok: true, data });
    expect(payload.evidence_summary).toBe('Evidence: 62 · Substantial');
    expect(payload.evidence_breakdown).toBe('Claims across the network 18/35');
  });
});

describe('formatEvidenceSummary', () => {
  it('renders withheld, insufficient, and weak-confidence states', () => {
    const base = {
      evidenceDisclosed: true,
      evidenceScore: 62,
      evidenceLevel: 'substantial' as const,
      hasSufficientData: true,
    };
    expect(formatEvidenceSummary({ ...base, evidenceDisclosed: false }, 'probable')).toBe(
      'Not enough network coverage to share',
    );
    expect(formatEvidenceSummary({ ...base, hasSufficientData: false }, 'probable')).toBe('Not enough evidence yet');
    expect(formatEvidenceSummary(base, 'weak')).toContain('Identity match confidence is weak');
  });
});

describe('formatEvidenceBreakdown', () => {
  it('renders a neutral message when evidence is withheld', () => {
    expect(
      formatEvidenceBreakdown({
        evidenceDisclosed: false,
        hasSufficientData: true,
        scoreBreakdown: [],
      }),
    ).toContain('coverage threshold');
  });
});
