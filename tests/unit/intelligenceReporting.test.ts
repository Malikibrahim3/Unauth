import { aggregateMoneyBridges, buildReportTrend, parseReportRange, reportCutoff, REPORT_DEFINITIONS } from '@/lib/reporting/intelligence';

describe('intelligence reporting contracts',()=>{
 it('never combines currencies and calculates outstanding from canonical categories',()=>{
  const result=aggregateMoneyBridges([
   {support_payout_case_id:'a',currency:'gbp',requested_minor:10000,paid_minor:5000,prevented_minor:5000,confirmed_loss_minor:4000,recoverable_minor:3000,recovered_minor:1000,written_off_minor:500},
   {support_payout_case_id:'b',currency:'GBP',requested_minor:2000,recoverable_minor:1000,recovered_minor:250},
   {support_payout_case_id:'c',currency:'USD',requested_minor:9000,paid_minor:9000},
  ]);
  expect(result.map(x=>x.currency)).toEqual(['GBP','USD']);
  expect(result[0]).toMatchObject({requestedMinor:12000,paidMinor:5000,recoverableMinor:4000,recoveredMinor:1250,writtenOffMinor:500,outstandingMinor:2250});
 expect(result[1].requestedMinor).toBe(9000);
 });
 it('builds dated chart series for every currency without combining totals',()=>{
  const result=buildReportTrend(
   [
    {id:'a',submitted_at:'2026-07-01T12:00:00Z'},
    {id:'b',submitted_at:'2026-07-01T14:00:00Z'},
    {id:'c',submitted_at:'2026-07-02T09:00:00Z'},
   ],
   [
    {support_payout_case_id:'a',currency:'GBP',requested_minor:1000,recovered_minor:200},
    {support_payout_case_id:'b',currency:'USD',requested_minor:3000,recovered_minor:0},
    {support_payout_case_id:'c',currency:'GBP',requested_minor:500,recovered_minor:100},
   ],
  );
  expect(result).toEqual([
   {currency:'GBP',date:'2026-07-01',exposureMinor:1000,recoveredMinor:200},
   {currency:'GBP',date:'2026-07-02',exposureMinor:500,recoveredMinor:100},
   {currency:'USD',date:'2026-07-01',exposureMinor:3000,recoveredMinor:0},
  ]);
 });
 it('quarantines invalid source currencies instead of crashing or mixing them',()=>{
  const result=aggregateMoneyBridges([
   {support_payout_case_id:'bad',currency:'UNKNOWN',requested_minor:10000},
   {support_payout_case_id:'blank',currency:null,requested_minor:5000},
   {support_payout_case_id:'good',currency:'GBP',requested_minor:2500},
  ]);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({currency:'GBP',requestedMinor:2500});
 });
 it('uses exact UTC instants at period boundaries',()=>{expect(reportCutoff('7d',new Date('2026-07-12T12:00:00.000Z'))).toBe('2026-07-05T12:00:00.000Z');expect(reportCutoff('all')).toBeNull();});
 it('validates ranges and publishes all eight report definitions',()=>{expect(parseReportRange('oops')).toBe('30d');expect(REPORT_DEFINITIONS).toHaveLength(8);expect(REPORT_DEFINITIONS.every(d=>d.numerator&&d.denominator&&d.timeBasis)).toBe(true);});
});
