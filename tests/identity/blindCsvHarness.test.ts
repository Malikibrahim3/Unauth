import { ensureBlindFixtures, expectMerchantReadiness, runBlindDataset } from './blindHarness';

describe('blind merchant CSV harness', () => {
  beforeAll(() => {
    ensureBlindFixtures();
  });

  test('small sanity dataset has exact expected identity outcomes', async () => {
    const result = await runBlindDataset('small_sanity');

    expect(result.parse.valid).toBe(true);
    expect(result.invalidRows).toEqual([]);
    expect(result.diagnostics.rowsFetched).toBe(result.expectedSummary.totalRows);
    expect(result.diagnostics.falseNegativeIds).toEqual([]);
    expect(result.diagnostics.falsePositiveIds).toEqual([]);
    // "Should flag" = review-worthy (identity match + suspicious behaviour) =
    // diagnostics.actualFlagged. summary.flaggedTransactions is a different
    // metric (raw identity-match count, behaviour-independent).
    expect(result.diagnostics.actualFlagged).toBe(result.expectedSummary.expectedFlaggedRows);
    expect(result.diagnostics.distinctAddresses).toBeGreaterThanOrEqual(result.expectedSummary.acceptance.minDistinctNormalizedAddresses);
    expect(result.diagnostics.nullScoreWithCluster).toEqual([]);
  }, 60_000);

  test('medium realistic dataset catches over-flagging and missed seeded rings', async () => {
    const result = await runBlindDataset('medium_realistic');
    expectMerchantReadiness(result);
  }, 90_000);

  test('negative control stays near zero review-worthy rate', async () => {
    const result = await runBlindDataset('negative_control');
    expect(result.parse.valid).toBe(true);
    expect(result.invalidRows).toEqual([]);
    expect(result.diagnostics.reviewRate).toBeLessThanOrEqual(result.expectedSummary.acceptance.maxReviewRate);
    expect(result.diagnostics.scenarioOutcomes.false_corporate_office?.falsePositives ?? 0).toBe(0);
    expect(result.diagnostics.scenarioOutcomes.false_bin_last4_collision?.falsePositives ?? 0).toBe(0);
    expect(result.diagnostics.largestCluster).toBeLessThanOrEqual(result.expectedSummary.acceptance.maxLargestCluster);
  }, 90_000);

  test('adversarial fraud dataset detects hidden identity changes without detonating traps', async () => {
    const result = await runBlindDataset('adversarial_fraud');
    expect(result.parse.valid).toBe(true);
    expect(result.invalidRows).toEqual([]);
    expect(result.diagnostics.seededRecall).toBeGreaterThanOrEqual(result.expectedSummary.acceptance.minSeededRecall);
    expect(result.diagnostics.reviewRate).toBeLessThanOrEqual(result.expectedSummary.acceptance.maxReviewRate);
    expect(result.diagnostics.scenarioOutcomes.false_corporate_office?.falsePositives ?? 0).toBe(0);
    expect(result.diagnostics.nullScoreWithCluster).toEqual([]);
  }, 90_000);

  test('large merchant-scale dataset processes all rows and does not cap at 1000', async () => {
    const started = Date.now();
    const result = await runBlindDataset('large_merchant_scale');
    const durationMs = Date.now() - started;

    expectMerchantReadiness(result);
    expect(result.diagnostics.rowsFetched).toBeGreaterThanOrEqual(5000);
    expect(result.diagnostics.rowsFetched).not.toBe(1000);

    expect(durationMs).toBeLessThan(120_000);
  }, 180_000);
});
