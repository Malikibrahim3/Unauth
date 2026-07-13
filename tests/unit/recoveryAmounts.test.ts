import { recoveryOutstanding, recoverySoughtAmount, validateCumulativeRecovery } from '@/lib/recoveries/amounts';

describe('recovery amount invariants', () => {
  it('supports partial recovery', () => expect(recoveryOutstanding({ sought: 100, recovered: 35, writtenOff: 0 })).toBe(65));
  it('supports recovery plus explicit write-off', () => expect(recoveryOutstanding({ sought: 100, recovered: 35, writtenOff: 65 })).toBe(0));
  it('rejects over-recovery', () => expect(() => recoveryOutstanding({ sought: 100, recovered: 101, writtenOff: 0 })).toThrow(/cannot exceed/));
  it('rejects decreasing cumulative recovery', () => expect(() => validateCumulativeRecovery({ sought: 100, previousRecovered: 50, nextRecovered: 40 })).toThrow(/cannot decrease/));
  it('uses the explicit recovery estimate before the broader eligibility ceiling', () => {
    expect(recoverySoughtAmount({ merchant_loss_amount: 80, eligible_loss_amount: 80, estimated_recoverable_max: 60 })).toBe(60);
  });
  it('never reports an amount pursued below the amount already recovered', () => {
    expect(recoverySoughtAmount({ merchant_loss_amount: 80, estimated_recoverable_max: 60, amount_recovered: 65 })).toBe(65);
  });
});
