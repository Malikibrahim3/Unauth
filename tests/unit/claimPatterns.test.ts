import { groupClaimPatterns, patternCaseRows, type PatternCase, type PatternReport } from '@/lib/reporting/claimPatterns';
import { buildClaimPatternExportRows } from '@/lib/reporting/export';
const makeCase=(id:string,orderId=id):PatternCase=>({id,orderId,submittedAt:'2026-09-01T00:00:00Z',groups:{issue:[{key:'missing',label:'Missing'}],sku:[{key:'sku',label:'SKU'}],carrier:[],warehouse:[]},allocationEligible:{issue:true,sku:true,carrier:false,warehouse:false},money:[{currency:'GBP',confirmed:100,matched:20,net:80}],work:[],evidenceHrefs:[]});
const report=(cases:PatternCase[]):PatternReport=>({from:'2026-08-01T00:00:00Z',to:'2026-09-07T00:00:00Z',readAt:'2026-09-07T00:00:00Z',timezone:'Europe/London',state:'complete',issues:[],cases,workAvailable:true});
test.each([[4,3,false],[5,2,false],[5,3,true]])('recurrence threshold %i cases / %i orders', (count,orders,expected)=>{
 const data=groupClaimPatterns(report(Array.from({length:count},(_,i)=>makeCase(String(i),String(i%orders)))),'issue');
 expect(data.groups[0].recurring).toBe(expected);expect(data.concentrations.length).toBe(expected?1:0);
});
test('multi-item counts overlap while the full case money stays unallocated',()=>{
 const row=makeCase('one');row.groups.sku.push({key:'second',label:'Second'});
 const data=groupClaimPatterns(report([row]),'sku');
 expect(data.groups.map(g=>g.caseIds)).toEqual([['one'],['one']]);
 expect(data.groups.every(g=>g.amounts.length===0)).toBe(true);
 expect(data.unallocated[0].confirmed).toBe(100);expect(data.totals[0].confirmed).toBe(100);
});
test('partially confirmed item does not allocate entire case money to its single confirmed SKU',()=>{
 const row=makeCase('one');row.allocationEligible.sku=false;
 const data=groupClaimPatterns(report([row]),'sku');expect(data.groups[0].amounts).toEqual([]);expect(data.unallocated[0].confirmed).toBe(100);
});
test('unknown group participates in denominator, unknown currency and unvalued cases survive',()=>{
 const a=makeCase('a'),b=makeCase('b');b.groups.issue=[];b.money=[];
 const data=groupClaimPatterns(report([a,b]),'issue');expect(data.groups.find(g=>g.key==='missing')!.share).toBe(.5);
 expect(data.totals.find(m=>m.currency===null)).toMatchObject({confirmed:null,unvalued:1});
 expect(patternCaseRows(report([a,b]),'issue','').map(row=>row.id)).toEqual(['b']);
});
test('mixed currency remains separate and net is unavailable without observed stage',()=>{
 const a=makeCase('a'),b=makeCase('b');b.money=[{currency:'USD',confirmed:200,matched:null,net:null}];
 expect(groupClaimPatterns(report([a,b]),'issue').totals).toEqual([{currency:'GBP',confirmed:100,matched:20,net:80,unvalued:0},{currency:'USD',confirmed:200,matched:null,net:null,unvalued:1}]);
});
test('only top three qualifying groups; partial reads suppress rankings and shares',()=>{
 const cases=Array.from({length:30},(_,i)=>{const row=makeCase(String(i));row.groups.issue=[{key:String(i%5),label:String(i%5)}];return row;});
 expect(groupClaimPatterns(report(cases),'issue').concentrations).toHaveLength(3);
 const partial={...report(cases),state:'partial' as const};expect(groupClaimPatterns(partial,'issue').concentrations).toEqual([]);expect(groupClaimPatterns(partial,'issue').groups.every(g=>g.share===null)).toBe(true);
});
test('supporting export has exact drilldown population, current scope and no multi-group allocation',()=>{
 const a=makeCase('a'),b=makeCase('b');b.groups.issue=[];const input=report([a,b]);
 const selected=patternCaseRows(input,'issue','missing');const rows=buildClaimPatternExportRows(input,'issue',selected);
 expect(rows).toHaveLength(2);expect(rows[1][8]).toBe('a');expect(rows[1][1]).toBe(input.from);expect(rows[1][2]).toBe(input.to);expect(rows[1][16]).toBe('single established group');
});
