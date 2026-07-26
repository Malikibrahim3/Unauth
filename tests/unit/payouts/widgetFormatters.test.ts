import {
  formatEvidenceChecklist,
  formatLossAttribution,
  formatPayoutExposure,
  formatPayoutFields,
  formatRecoveryPath,
} from '@/lib/gorgias/widgetJson';
import { buildSupportPayoutCase } from '@/lib/payouts/supportPayoutCase';
import { makeContext } from './context';

describe('Gorgias payout field formatters', () => {
  it('formats exposure with a review flag and currency symbol', () => {
    const c = buildSupportPayoutCase(makeContext(), { refundAmount: 84.2, reviewThreshold: 75 });
    const s = formatPayoutExposure(c.exposure);
    expect(s).toContain('£84.20');
    expect(s).toContain('estimated payout exposure');
    expect(s).toContain('requires review');
  });

  it('formats a strong evidence checklist with present/missing lists', () => {
    const c = buildSupportPayoutCase(makeContext());
    const s = formatEvidenceChecklist(c.evidence);
    expect(s.startsWith('Evidence: strong')).toBe(true);
    expect(s).toContain('present:');
  });

  it('formats a missing checklist with a request-evidence nudge', () => {
    const ctx = makeContext({
      delivery: null,
      order: null,
      evidence: { hasCustomerEvidence: false, customerEvidenceItems: 0, merchantEvidenceItems: 0, deliveryEvidenceItems: 0, totalEvidenceItems: 0, hasDeliveryEvidence: false },
    });
    const c = buildSupportPayoutCase(ctx);
    expect(formatEvidenceChecklist(c.evidence)).toContain('request evidence');
  });

  it('keeps consistent delivery artefacts non-dispositive', () => {
    const c = buildSupportPayoutCase(makeContext({
      delivery: { deliveryPhotoFinding: 'consistent' },
    }));
    const s = formatLossAttribution(c.attribution);
    expect(s).toContain('delivery artefact is on file');
    expect(s).toContain('needs more evidence');
  });

  it('formats needs-more-evidence attribution', () => {
    const c = buildSupportPayoutCase(makeContext({ delivery: null }));
    expect(formatLossAttribution(c.attribution)).toContain('needs more evidence');
  });

  it('formats a recovery route with owner and next step', () => {
    const c = buildSupportPayoutCase(makeContext());
    const s = formatRecoveryPath(c.recovery);
    expect(s).toContain('Recovery:');
    expect(s).toContain('Open case →');
  });

  it('produces four non-empty payout fields', () => {
    const c = buildSupportPayoutCase(makeContext());
    const fields = formatPayoutFields(c);
    for (const value of Object.values(fields)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      expect(value).not.toBe('—');
    }
  });
});
