import {
  INTEGRATION_BACKFILL_MONTHS,
  integrationBackfillSinceDate,
} from '@/lib/integrations/backfillWindow';

describe('integrationBackfillWindow', () => {
  it('uses a 24-month lookback window', () => {
    expect(INTEGRATION_BACKFILL_MONTHS).toBe(24);
    const since = integrationBackfillSinceDate();
    const monthsAgo =
      (Date.now() - since.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    expect(monthsAgo).toBeGreaterThan(23);
    expect(monthsAgo).toBeLessThan(25);
  });
});
