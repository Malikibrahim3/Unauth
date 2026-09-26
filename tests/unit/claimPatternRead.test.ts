import { loadClaimPatterns, readPatternRelations, claimPatternFingerprint } from '@/lib/reporting/claimPatternRead';
const asOf=new Date('2026-09-07T00:00:00Z');
function client(tables:Record<string,any[]>, fail='', truncate=false) {
 return {from:(table:string)=>{
  let rows=tables[table]??[],start=0,end=Infinity;
  const query:any={select:()=>query,eq:(key:string,value:unknown)=>{rows=rows.filter(row=>row[key]===value);return query;},in:(key:string,values:unknown[])=>{rows=rows.filter(row=>values.includes(row[key]));return query;},order:()=>query,range:(a:number,b:number)=>{start=a;end=b+1;return query;},limit:(n:number)=>{end=n;return query;},gte:(key:string,value:string)=>{rows=rows.filter(row=>row[key]>=value);return query;},lt:(key:string,value:string)=>{rows=rows.filter(row=>row[key]<value);return query;},then:(resolve:any)=>resolve({data:rows.slice(start,truncate?start+1:end),count:rows.length,error:table===fail?{message:'failed'}:null})};return query;
 }};
}
const scoped=(rows:any[])=>rows.map(row=>({merchant_id:'merchant',...row}));
const baseline=()=>({support_payout_cases:scoped([{id:'case',source_order_id:'order',claim_type:'missing',submitted_at:'2026-09-01T00:00:00Z'}]),source_shipments:scoped([{id:'parcel',external_id:'parcel-external',raw_metadata:{order:{shipments:[{id:'parcel-external',location:{id:'loc'}}]}},source_order_id:'order',source_account_id:'account',source_record_id:'evidence',carrier:'Carrier',}]),source_accounts:scoped([{id:'account',provider_id:'shipbob'}]),source_locations:scoped([{id:'location',external_id:'loc',source_account_id:'account',source_record_id:'loc-record',name:'Warehouse'}])});
test('single parcel and evidenced canonical origin qualify; foreign tenant rows are excluded',async()=>{
 const tables=baseline();tables.support_payout_cases.push({id:'foreign',source_order_id:'order',claim_type:'missing',submitted_at:'2026-09-01T00:00:00Z',merchant_id:'other'});
 const report=await loadClaimPatterns(client(tables),'merchant','30d','Europe/London',asOf);
 expect(report.cases).toHaveLength(1);expect(report.cases[0].groups.carrier[0].label).toBe('Carrier');expect(report.cases[0].groups.warehouse[0].key).toBe('location');
});
test('ambiguous multi-parcel order never picks first or newest; missing origin remains unassigned',async()=>{
 const tables=baseline();tables.source_shipments.push({...tables.source_shipments[0],id:'parcel-two'});
 const report=await loadClaimPatterns(client(tables),'merchant','30d','UTC',asOf);
 expect(report.cases[0].groups.carrier).toEqual([]);expect(report.cases[0].groups.warehouse).toEqual([]);
});
test('only confirmed claimed lines of the same canonical order establish SKU',async()=>{
 const tables:any=baseline();tables.case_claimed_items=scoped([{id:'item',support_payout_case_id:'case',source_order_line_id:'line',match_status:'candidate'}]);tables.source_order_lines=scoped([{id:'line',source_order_id:'order',sku:'SKU'}]);
 expect((await loadClaimPatterns(client(tables),'merchant','30d','UTC',asOf)).cases[0].groups.sku).toEqual([]);
 tables.case_claimed_items[0].match_status='confirmed';expect((await loadClaimPatterns(client(tables),'merchant','30d','UTC',asOf)).cases[0].groups.sku[0].label).toBe('SKU');
 tables.source_order_lines[0].source_order_id='other-order';expect((await loadClaimPatterns(client(tables),'merchant','30d','UTC',asOf)).cases[0].groups.sku).toEqual([]);
});
test('date boundaries include start and exclude end',async()=>{
 const tables=baseline();tables.support_payout_cases=scoped([{id:'start',submitted_at:'2026-08-08T00:00:00.000Z'},{id:'end',submitted_at:asOf.toISOString()}]);
 expect((await loadClaimPatterns(client(tables),'merchant','30d','UTC',asOf)).cases.map(row=>row.id)).toEqual(['start']);
});
test('failed cohort is unavailable; over-cap cohort is not sampled',async()=>{
 expect((await loadClaimPatterns(client({},'support_payout_cases'),'merchant','30d','UTC',asOf)).state).toBe('unavailable');
 const rows=scoped(Array.from({length:501},(_,i)=>({id:String(i),submitted_at:'2026-09-01'})));
 const report=await loadClaimPatterns(client({support_payout_cases:rows}),'merchant','30d','UTC',asOf);expect(report.state).toBe('capped');expect(report.cases).toEqual([]);
});
test('partial relations withhold values and unavailable Work blocks the action',async()=>{
 const report=await loadClaimPatterns(client(baseline(),'work_tasks'),'merchant','30d','UTC',asOf);expect(report.state).toBe('partial');expect(report.workAvailable).toBe(false);
});
test('relation reads paginate and reject a server-truncated page',async()=>{
 const tables={related:scoped(Array.from({length:600},(_,i)=>({id:String(i),case_id:'case'})))};
 expect(await readPatternRelations(client(tables),'merchant','related','id','case_id',['case'])).toHaveLength(600);
 await expect(readPatternRelations(client(tables,'',true),'merchant','related','id','case_id',['case'])).rejects.toThrow('partial');
});
test('fingerprint changes with outcomes so export can reject drift',async()=>{
 const report=await loadClaimPatterns(client(baseline()),'merchant','30d','UTC',asOf);const hash=claimPatternFingerprint(report);report.cases[0].money.push({currency:'GBP',confirmed:100,matched:null,net:null});expect(claimPatternFingerprint(report)).not.toBe(hash);
});

test('an incomplete cohort cannot display verified zero',async()=>{
 const tables=baseline();tables.support_payout_cases.push({...tables.support_payout_cases[0],id:'another'});
 const report=await loadClaimPatterns(client(tables,'',true),'merchant','30d','UTC',asOf);expect(report.state).toBe('unavailable');expect(report.cases).toEqual([]);
});
test('confirmed item resolves one of multiple parcels; provider name never establishes origin',async()=>{
 const tables:any=baseline();tables.source_shipments.push({...tables.source_shipments[0],id:'other',carrier:'Other'});
 tables.source_shipments[0].raw_metadata={};
 tables.case_claimed_items=scoped([{id:'item',support_payout_case_id:'case',source_order_line_id:'line',match_status:'confirmed'}]);
 tables.source_order_lines=scoped([{id:'line',source_order_id:'order',sku:'SKU'}]);
 tables.source_shipment_lines=scoped([{id:'link',source_order_line_id:'line',source_shipment_id:'parcel'}]);
 const report=await loadClaimPatterns(client(tables),'merchant','30d','UTC',asOf);
 expect(report.cases[0].groups.carrier.map(group=>group.label)).toEqual(['Carrier']);expect(report.cases[0].groups.warehouse).toEqual([]);
});

test.each(['wrong-account','wrong-provider','duplicate','missing-record'])('origin fails closed for %s',async(mode)=>{
 const tables:any=baseline();
 if(mode==='wrong-account')tables.source_locations[0].source_account_id='other';
 if(mode==='wrong-provider')tables.source_accounts[0].provider_id='other';
 if(mode==='missing-record')tables.source_shipments[0].source_record_id=null;
 if(mode==='duplicate')tables.source_shipments[0].raw_metadata.order.shipments.push({...tables.source_shipments[0].raw_metadata.order.shipments[0]});
 expect((await loadClaimPatterns(client(tables),'merchant','30d','UTC',asOf)).cases[0].groups.warehouse).toEqual([]);
});
