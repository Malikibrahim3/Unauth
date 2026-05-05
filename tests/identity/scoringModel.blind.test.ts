import { linkIdentities, type LinkerOrderInput } from '../../lib/linker';
import { scoreIdentityFromSignals } from '../../lib/scorer';

function ids(base: Partial<LinkerOrderInput>): LinkerOrderInput {
  return {
    order_id: base.order_id ?? `o-${Math.random()}`,
    email: base.email ?? null,
    phone: base.phone ?? null,
    address: base.address ?? null,
    postcode: base.postcode ?? null,
    ip: base.ip ?? null,
    card_last4: base.card_last4 ?? null,
    card_bin: base.card_bin ?? null,
    device_fingerprint: base.device_fingerprint ?? null,
    account_id: base.account_id ?? null,
  };
}

describe('blind identity signal acceptance cases', () => {
  test('same phone + same account + email variant is probable or definite', () => {
    const result = linkIdentities([
      ids({ order_id: 'a', email: 'jane.doe+1@gmail.com', phone: '07999111111', account_id: 'acct_1' }),
      ids({ order_id: 'b', email: 'janedoe+2@gmail.com', phone: '+44 7999 111111', account_id: 'acct_1' }),
    ]);
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters[0].signals_matched).toEqual(expect.arrayContaining(['phone', 'account', 'email']));
    expect(['probable', 'definite']).toContain(scoreIdentityFromSignals(result.clusters[0].signals_matched).identity_confidence_grade);
  });

  test('same IP only is not a flag', () => {
    const result = linkIdentities([
      ids({ order_id: 'a', email: 'a@example.test', ip: '203.0.113.9' }),
      ids({ order_id: 'b', email: 'b@example.test', ip: '203.0.113.9' }),
    ]);
    expect(result.clusters).toHaveLength(0);
  });

  test('same address or postcode only is not a definite link', () => {
    const result = linkIdentities([
      ids({ order_id: 'a', email: 'a@example.test', address: '1 Office Road, London', postcode: 'E14 5AB' }),
      ids({ order_id: 'b', email: 'b@example.test', address: '1 Office Rd London', postcode: 'E14 5AB' }),
    ]);
    expect(result.clusters).toHaveLength(0);
  });

  test('BIN + last4 only is not definite', () => {
    const result = linkIdentities([
      ids({ order_id: 'a', email: 'a@example.test', card_bin: '424242', card_last4: '1111' }),
      ids({ order_id: 'b', email: 'b@example.test', card_bin: '424242', card_last4: '1111' }),
    ]);
    expect(result.clusters).toHaveLength(0);
  });

  test('same full device/fingerprint + same phone is definite/probable', () => {
    const result = linkIdentities([
      ids({ order_id: 'a', email: 'a1@example.test', phone: '07999123456', device_fingerprint: 'dev-full-1' }),
      ids({ order_id: 'b', email: 'a2@example.test', phone: '+44 7999 123456', device_fingerprint: 'dev-full-1' }),
    ]);
    expect(result.clusters).toHaveLength(1);
    const scored = scoreIdentityFromSignals(result.clusters[0].signals_matched);
    expect(['probable', 'definite']).toContain(scored.identity_confidence_grade);
    expect(scored.identity_score).toBeGreaterThanOrEqual(50);
  });

  test('shared reshipping address with refund pattern is not automatic definite without independent identity signals', () => {
    const result = linkIdentities([
      ids({ order_id: 'a', email: 'a@example.test', address: 'Unit 9 Reship Yard', postcode: 'IG11 8BB' }),
      ids({ order_id: 'b', email: 'b@example.test', address: 'Unit 9 Reship Yard', postcode: 'IG11 8BB' }),
      ids({ order_id: 'c', email: 'c@example.test', address: 'Unit 9 Reship Yard', postcode: 'IG11 8BB' }),
    ]);
    expect(result.clusters).toHaveLength(0);
  });
});
