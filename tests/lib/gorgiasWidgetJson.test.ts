import { claimWidgetToJson } from '@/lib/gorgias/widgetJson';

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
    profileUrl: null,
  },
};

describe('claimWidgetToJson', () => {
  it('formats unlocked merchant context into comparison rows', () => {
    const payload = claimWidgetToJson(OK_RESULT, undefined, { allowDetailedPreview: true });

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

  it('uses credit-gated preview by default in non-production', () => {
    const payload = claimWidgetToJson(OK_RESULT);

    expect(payload.orders).toBe('View Network Check — 2 credits');
    expect(payload.claim_rate).toBe('Generate Case Report — 3 credits');
    expect(payload.identity).toBe('Context available for this ticket');
  });

  it('not_found renders a factual fallback when detailed preview is allowed', () => {
    const payload = claimWidgetToJson({ ok: false, kind: 'not_found' }, undefined, {
      allowDetailedPreview: true,
    });

    expect(payload.orders).toBe('Not seen at any store yet');
    expect(payload.claim_rate).toBe('—');
    expect(payload.primary_reason).toBe('—');
    expect(payload.recent_activity).toBe('—');
  });

  it('never returns null fields for current widget payloads', () => {
    const payload = claimWidgetToJson({ ok: false, kind: 'not_found' }, undefined, {
      allowDetailedPreview: true,
    });
    expect(Object.values(payload).every((v) => typeof v === 'string')).toBe(true);
  });
});
