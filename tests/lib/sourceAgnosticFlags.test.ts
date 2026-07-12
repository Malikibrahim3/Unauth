import { sourceAgnosticFlags } from '@/lib/utils/sourceAgnosticFlags';
describe('source-agnostic cutover flags', () => {
  it('defaults reads and writes off', () => { expect(sourceAgnosticFlags({})).toMatchObject({ readsEnabled: false, writesEnabled: false }); });
  it('enables reads for an explicit pilot without global cutover', () => { const flags = sourceAgnosticFlags({ SOURCE_AGNOSTIC_PILOT_MERCHANTS: 'm1,m2' }); expect(flags.readsForMerchant('m2')).toBe(true); expect(flags.readsForMerchant('m3')).toBe(false); });
  it('requires the exact true value', () => { expect(sourceAgnosticFlags({ SOURCE_AGNOSTIC_READS: 'TRUE', SOURCE_AGNOSTIC_WRITES: '1' })).toMatchObject({ readsEnabled: false, writesEnabled: false }); });
});
