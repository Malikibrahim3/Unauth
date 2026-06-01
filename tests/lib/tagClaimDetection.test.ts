import {
  detectClaimFromKeywords,
  detectClaimFromTags,
  getDefaultTagConfig,
  type MerchantClaimTagConfig,
} from '@/lib/support/intake/tagClaimDetection';

const config: MerchantClaimTagConfig = {
  ...getDefaultTagConfig('gorgias'),
  keyword_fallback_enabled: true,
};

describe('tag-based claim detection', () => {
  it('creates a tag-detected claim for the Gorgias RETURN/EXCHANGE default', () => {
    const result = detectClaimFromTags(config, { tags: ['RETURN/EXCHANGE'] });
    expect(result).toMatchObject({
      action: 'create_or_confirm_claim',
      detectionMethod: 'tag',
      triggerTag: 'return/exchange',
      requiresMerchantReview: false,
    });
  });

  it('updates status for an outcome tag', () => {
    expect(detectClaimFromTags(config, { tags: ['refund-issued'] })).toMatchObject({
      action: 'update_status',
      newStatus: 'resolved_refunded',
      triggerTag: 'refund-issued',
    });
  });

  it('voids before any other tag action', () => {
    expect(detectClaimFromTags(config, { tags: ['refund-request', 'not-a-claim'] })).toMatchObject({
      action: 'void',
      triggerTag: 'not-a-claim',
    });
  });

  it('does not create a claim for refund text when fallback is disabled', () => {
    const result = detectClaimFromTags(
      { ...config, keyword_fallback_enabled: false },
      {
        tags: [],
        messages: [{ sender_type: 'customer', body_text: 'I want a refund' }],
      }
    );
    expect(result.action).toBe('no_claim');
  });

  it('creates a review-required keyword fallback claim for chargeback text', () => {
    const result = detectClaimFromTags(config, {
      tags: [],
      messages: [{ sender_type: 'customer', body_text: 'I will file a chargeback' }],
    });
    expect(result).toMatchObject({
      action: 'create_or_confirm_claim',
      detectionMethod: 'keyword_fallback',
      requiresMerchantReview: true,
      keywordMatched: 'chargeback',
    });
  });

  it('normalizes tag case', () => {
    const result = detectClaimFromTags(
      { ...config, claim_trigger_tags: ['return/exchange'] },
      { tags: ['RETURN/EXCHANGE'] }
    );
    expect(result).toMatchObject({ action: 'create_or_confirm_claim', triggerTag: 'return/exchange' });
  });

  it('does not scan internal notes or agent messages for fallback keywords', () => {
    expect(
      detectClaimFromKeywords({
        tags: [],
        messages: [
          { sender_type: 'customer', message_type: 'internal_note', body_text: 'chargeback' },
          { sender_type: 'agent', body_text: 'chargeback', is_from_agent: true },
        ],
      })
    ).toBeNull();
  });

  it('does not scan automated or system messages for fallback keywords', () => {
    expect(
      detectClaimFromKeywords({
        tags: [],
        messages: [
          { sender_type: 'customer', source_type: 'automated', body_text: 'chargeback confirmed' },
          { sender_type: 'system', body_text: 'chargeback confirmed' },
          { sender_type: 'customer', is_automated: true, body_text: 'chargeback confirmed' },
        ],
      })
    ).toBeNull();
  });

  it('flags retroactive tags for merchant review', () => {
    const result = detectClaimFromTags(
      config,
      { tags: ['chargeback'], created_at_provider: '2025-01-01T00:00:00Z' },
      { now: new Date('2026-06-01T00:00:00Z') }
    );
    expect(result).toMatchObject({
      action: 'create_or_confirm_claim',
      requiresMerchantReview: true,
    });
  });

  it('returns all simultaneous trigger tags for audit', () => {
    const result = detectClaimFromTags(config, { tags: ['refund-request', 'chargeback'] });
    expect(result).toMatchObject({
      action: 'create_or_confirm_claim',
      triggerTags: ['refund-request', 'chargeback'],
    });
  });

  it('does not auto-void when a trigger tag was removed', () => {
    const result = detectClaimFromTags(config, { tags: [] });
    expect(result.action).toBe('no_claim');
  });
});
