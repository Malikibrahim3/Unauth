import { aggregateMoneyBridges, buildReportTrend, dashboardPreviousPeriodWindow, enforceFinancialTruth, normalizeReportTimezone, parseReportRange, reportCutoff, reportDateKey, REPORT_DEFINITIONS } from '@/lib/reporting/intelligence';

describe('intelligence reporting contracts',()=>{
 it('never combines currencies and calculates outstanding from canonical categories',()=>{
  const result=aggregateMoneyBridges([
   {support_payout_case_id:'a',currency:'gbp',requested_minor:10000,exposed_minor:8000,paid_minor:5000,prevented_minor:5000,confirmed_loss_minor:4000,recoverable_minor:3000,recovered_minor:1000,written_off_minor:500,known_states:['requested','exposed','paid']},
   {support_payout_case_id:'b',currency:'GBP',requested_minor:2000,exposed_minor:1500,recoverable_minor:1000,recovered_minor:250,known_states:['requested','exposed','recoverable']},
   {support_payout_case_id:'c',currency:'USD',requested_minor:9000,exposed_minor:9000,paid_minor:9000,known_states:['requested','exposed','paid']},
  ]);
  expect(result.map(x=>x.currency)).toEqual(['GBP','USD']);
  expect(result[0]).toMatchObject({requestedMinor:12000,exposedMinor:9500,paidMinor:5000,recoverableMinor:1000,recoveredMinor:0,writtenOffMinor:0,outstandingMinor:1000,knownStates:['exposed','paid','recoverable','requested']});
  expect(result[0].caseIdsByState).toMatchObject({
   requested:['a','b'],
   exposed:['a','b'],
   paid:['a'],
   recoverable:['b'],
   outstanding:['b'],
  });
 expect(result[1].requestedMinor).toBe(9000);
 });
 it('calculates outstanding recovery and final net loss per case before currency aggregation',()=>{
  const [result]=aggregateMoneyBridges([
   {support_payout_case_id:'over',currency:'GBP',confirmed_loss_minor:100,recoverable_minor:100,recovered_minor:150,written_off_minor:0,known_states:['confirmed_loss','recoverable','recovered']},
   {support_payout_case_id:'open',currency:'GBP',confirmed_loss_minor:100,recoverable_minor:100,recovered_minor:0,written_off_minor:0,known_states:['confirmed_loss','recoverable','recovered']},
  ]);
  expect(result.outstandingMinor).toBe(100);
  expect(result.finalNetLossMinor).toBe(100);
 });
 it('withholds eligible and recovered stages when the confirmed-loss bound is missing or exceeded',()=>{
  const result=enforceFinancialTruth([
   {support_payout_case_id:'estimate-only',currency:'GBP',confirmed_loss_minor:null,recoverable_minor:1100,recovered_minor:100,known_states:['recoverable','recovered']},
   {support_payout_case_id:'over-bound',currency:'GBP',confirmed_loss_minor:500,recoverable_minor:600,recovered_minor:100,known_states:['confirmed_loss','recoverable','recovered']},
   {support_payout_case_id:'valid',currency:'GBP',confirmed_loss_minor:1000,recoverable_minor:600,recovered_minor:100,known_states:['confirmed_loss','recoverable','recovered']},
  ]);
  expect(result.rows.map((row)=>row.known_states)).toEqual([[],['confirmed_loss'],['confirmed_loss','recoverable','recovered']]);
  expect(result.issues).toHaveLength(1);
  expect(result.issues[0]).toContain('eligible recovery is unavailable');
  expect(aggregateMoneyBridges(result.rows)[0]).toMatchObject({recoverableMinor:600,recoveredMinor:100});
 });
 it('builds dated chart series for every currency without combining totals',()=>{
  const result=buildReportTrend(
   [
    {id:'a',submitted_at:'2026-07-01T12:00:00Z'},
    {id:'b',submitted_at:'2026-07-01T14:00:00Z'},
    {id:'c',submitted_at:'2026-07-02T09:00:00Z'},
   ],
   [
    {support_payout_case_id:'a',currency:'GBP',exposed_minor:1000,recovered_minor:200,prevented_minor:150,confirmed_loss_minor:80,known_states:['exposed','recovered','prevented','confirmed_loss']},
    {support_payout_case_id:'b',currency:'USD',exposed_minor:3000,recovered_minor:0,prevented_minor:500,confirmed_loss_minor:250,known_states:['exposed','recovered','prevented','confirmed_loss']},
    {support_payout_case_id:'c',currency:'GBP',exposed_minor:500,recovered_minor:100,prevented_minor:0,confirmed_loss_minor:50,known_states:['exposed','recovered','prevented','confirmed_loss']},
   ],
  );
  expect(result).toEqual([
   {currency:'GBP',date:'2026-07-01',exposureMinor:1000,recoveredMinor:200,preventedMinor:150,realisedLossMinor:80,knownStates:['confirmed_loss','exposed','prevented','recovered']},
   {currency:'GBP',date:'2026-07-02',exposureMinor:500,recoveredMinor:100,preventedMinor:0,realisedLossMinor:50,knownStates:['confirmed_loss','exposed','prevented','recovered']},
   {currency:'USD',date:'2026-07-01',exposureMinor:3000,recoveredMinor:0,preventedMinor:500,realisedLossMinor:250,knownStates:['confirmed_loss','exposed','prevented','recovered']},
  ]);
 });
 it('excludes unknown amounts from trends while retaining a proven zero',()=>{
  const result=buildReportTrend(
   [
    {id:'unknown',submitted_at:'2026-07-01T12:00:00Z'},
    {id:'zero',submitted_at:'2026-07-02T12:00:00Z'},
   ],
   [
    {support_payout_case_id:'unknown',currency:'GBP',exposed_minor:700,recovered_minor:900,known_states:['exposed']},
    {support_payout_case_id:'zero',currency:'GBP',recovered_minor:0,known_states:['recovered']},
   ],
  );
  expect(result[0]).toMatchObject({exposureMinor:700,recoveredMinor:0,knownStates:['exposed']});
  expect(result[1]).toMatchObject({exposureMinor:0,recoveredMinor:0,knownStates:['recovered']});
 });
 it('quarantines invalid source currencies instead of crashing or mixing them',()=>{
  const result=aggregateMoneyBridges([
   {support_payout_case_id:'bad',currency:'UNKNOWN',requested_minor:10000,known_states:['requested']},
   {support_payout_case_id:'blank',currency:null,requested_minor:5000,known_states:['requested']},
   {support_payout_case_id:'good',currency:'GBP',requested_minor:2500,known_states:['requested']},
  ]);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({currency:'GBP',requestedMinor:2500});
 });
 it('uses exact UTC instants at period boundaries',()=>{expect(reportCutoff('7d',new Date('2026-07-12T12:00:00.000Z'))).toBe('2026-07-05T12:00:00.000Z');expect(reportCutoff('all')).toBeNull();});
 it('buckets trend instants in the selected report timezone',()=>{
  expect(reportDateKey('2026-07-01T00:30:00.000Z','America/Los_Angeles')).toBe('2026-06-30');
  expect(reportDateKey('2026-07-01T00:30:00.000Z','Asia/Tokyo')).toBe('2026-07-01');
  expect(normalizeReportTimezone('not/a-timezone')).toBe('UTC');
  const result=buildReportTrend(
   [{id:'a',submitted_at:'2026-07-01T00:30:00.000Z'}],
   [{support_payout_case_id:'a',currency:'GBP',exposed_minor:100,known_states:['exposed']}],
   'America/Los_Angeles',
  );
  expect(result[0].date).toBe('2026-06-30');
 });
 it('builds a previous period with the same exact duration',()=>{
  expect(dashboardPreviousPeriodWindow('30d',new Date('2026-07-16T12:30:00.000Z'))).toEqual({
   range:'30d',
   startAt:'2026-05-17T12:30:00.000Z',
   endAt:'2026-06-16T12:30:00.000Z',
  });
  expect(dashboardPreviousPeriodWindow('all')).toBeNull();
 });
 it('validates ranges and publishes all eight report definitions',()=>{expect(parseReportRange('oops')).toBe('30d');expect(REPORT_DEFINITIONS).toHaveLength(8);expect(REPORT_DEFINITIONS.every(d=>d.numerator&&d.denominator&&d.timeBasis)).toBe(true);});
});
