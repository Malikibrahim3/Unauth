import fs from 'node:fs';
import path from 'node:path';

const seed = fs.readFileSync(path.join(process.cwd(), 'scripts/seed-demo-v2.mjs'), 'utf8');

describe('canonical demo seed contract', () => {
  it('uses only current loss-attribution enum values', () => {
    const allowed = new Set([
      'customer_claim',
      'carrier_loss',
      'carrier_damage',
      'delivery_confirmed_evidence',
      'warehouse_mispick',
      'warehouse_missing_item',
      'three_pl_late_dispatch',
      'supplier_defect',
      'packaging_failure',
      'merchant_policy',
      'unknown',
      'repeat_claimant',
      'policy_override',
    ]);
    const configured = [...seed.matchAll(/lossAttribution:\s*'([^']+)'/g)].map((match) => match[1]);
    expect(configured.length).toBeGreaterThan(0);
    expect(configured.filter((value) => !allowed.has(value))).toEqual([]);
  });

  it('creates canonical losses before dependent recovery cases', () => {
    expect(seed.indexOf("upsertRows('loss_cases'")).toBeGreaterThan(0);
    expect(seed.indexOf("upsertRows('recovery_cases'")).toBeGreaterThan(
      seed.indexOf("upsertRows('loss_cases'"),
    );
    expect(seed).toContain("loss_case_id: uuid(`loss:${casePlan.key}`)");
    for (const field of [
      'amount_sought_minor',
      'amount_approved_minor',
      'amount_recovered_minor',
      'amount_written_off_minor',
    ]) {
      expect(seed).toContain(field);
    }
  });
});
