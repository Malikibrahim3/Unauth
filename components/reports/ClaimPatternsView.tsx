'use client';

import { useState } from 'react';
import Link from '@/components/navigation/AppNavLink';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { groupClaimPatterns, patternCaseRows, PATTERN_DIMENSIONS, type PatternDimension, type PatternReport, type PatternTotals } from '@/lib/reporting/claimPatterns';
import type { ReportRange } from '@/lib/reporting/intelligence';
import { formatDateTimeInTimeZone as formatDateTime, formatMinorCurrencyNullable } from '@/lib/utils/format';
import { shortRef } from '@/lib/ui/displayRef';

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";
const labels: Record<PatternDimension,string> = {issue:'Reported issue',carrier:'Carrier',sku:'Affected SKU',warehouse:'Warehouse'};
const cell: React.CSSProperties = {padding:'10px 12px',textAlign:'left',verticalAlign:'top',borderBottom:'1px solid #eae8e5',overflowWrap:'anywhere'};
const button: React.CSSProperties = {padding:'7px 11px',borderRadius:8,border:'1px solid #e4e3e0',background:'#fff',color:'#40454a',font:`500 12px/1.4 ${sans}`,cursor:'pointer'};
function Amounts({rows}: {rows:PatternTotals[]}) {
  return rows.length ? <>{rows.map(row=><div key={row.currency??'unknown'} style={{marginBottom:6,font:`400 12px/1.6 ${mono}`}}>
    {row.currency??'Unknown currency'}: {formatMinorCurrencyNullable(row.confirmed,row.currency)} confirmed · {formatMinorCurrencyNullable(row.matched,row.currency)} matched · {formatMinorCurrencyNullable(row.net,row.currency)} final net
    {row.unvalued>0 ? <div style={{fontFamily:sans}}>{row.unvalued} cases have unavailable stages.</div>:null}
  </div>)}</> : <div>Amounts unavailable</div>;
}

export function ClaimPatternsView({report,dimension,range,fingerprint,canInvestigate,canExport}: {report:PatternReport;dimension:PatternDimension;range:ReportRange;fingerprint:string;canInvestigate:boolean;canExport:boolean}) {
  const [selected,setSelected] = useState<string|null>(null);
  const [page,setPage] = useState(1);
  const data=groupClaimPatterns(report,dimension);
  const cases=patternCaseRows(report,dimension,selected);
  const selection=data.groups.find(group=>group.key===selected);
  const exportParams=new URLSearchParams({view:'patterns',range,timezone:report.timezone,asOf:report.to,dimension,fingerprint});
  if(selected!==null)exportParams.set('group',selected);
  const href=(value:PatternDimension)=>`/financials/reports?${new URLSearchParams({report:value,range,timezone:report.timezone})}`;
  const choose=(key:string|null)=>{setSelected(key);setPage(1);};
  const failed=report.state==='unavailable'||report.state==='capped';
  return <section data-surface-id="financial-reports" data-screen-label="Reports" style={{flex:1,minHeight:0,overflow:'auto',font:`400 13px/1.5 ${sans}`,color:'#40454a'}}>
    <SetBreadcrumbLabel label="Claim patterns" detail={labels[dimension]}/>
    <nav aria-label="Report grouping" style={{display:'flex',gap:8,flexWrap:'wrap',padding:'12px 22px',borderBottom:'1px solid #eae8e5'}}>
      <Link href="/financials/reports" style={button}>Attribution</Link>
      {PATTERN_DIMENSIONS.map(value=><Link key={value} href={href(value)} aria-current={dimension===value?'page':undefined} style={{...button,background:dimension===value?'#1c1f23':'#fff',color:dimension===value?'#fff':'#40454a'}}>{labels[value]}</Link>)}
    </nav>
    <div style={{padding:'16px 22px',display:'grid',gap:16}}>
      <header><h1 style={{margin:'0 0 6px',fontSize:20,color:'#1c1f23'}}>Claim patterns by {labels[dimension].toLowerCase()}</h1>
        <p style={{margin:'4px 0'}}>Cases submitted {report.from ? `from ${formatDateTime(report.from,report.timezone)} inclusive`:'across recorded history'} to {formatDateTime(report.to,report.timezone)} exclusive · {report.timezone}.</p>
        <p style={{margin:'4px 0'}}>Known outcomes read at {formatDateTime(report.readAt,report.timezone)}; these are cohort outcomes, not necessarily cash movements during this period. Association does not establish responsibility.</p>
        <form action="/financials/reports" style={{display:'flex',gap:8,alignItems:'center',marginTop:12}}><input type="hidden" name="report" value={dimension}/><input type="hidden" name="timezone" value={report.timezone}/><label htmlFor="pattern-range">Submitted within</label><select id="pattern-range" name="range" defaultValue={range} style={button}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All history</option></select><button style={button}>Apply period</button></form>
      </header>
      {report.issues.length>0?<div role="status" style={{padding:12,background:'#f4f3f1',borderRadius:10}}><strong>{report.state==='capped'?'Narrow this cohort':report.state==='unavailable'?'Patterns unavailable':'Partial report'}</strong>{report.issues.map(issue=><p key={issue}>{issue}</p>)}<Link href={href(dimension)}>Retry report</Link></div>:null}
      {!failed ? <>
        <section aria-label="Cohort totals" style={{padding:16,background:'#f4f3f1',borderRadius:10}}><strong>{report.cases.length} distinct cases · {data.orderCount} distinct linked orders · {report.cases.filter(row=>!row.orderId).length} cases without a confirmed order</strong><Amounts rows={data.totals}/><p style={{marginBottom:0}}>Counts across groups are non-additive. Shares use every case in this cohort, including unassigned cases. Amounts are allocated only to a single established group; unknown stages are shown as —.</p></section>
        <section><h2 style={{fontSize:15,color:'#1c1f23'}}>Largest recorded concentrations</h2><p>Display threshold: at least five cases across three distinct orders. This is not statistical significance. Ranked by distinct cases; maximum three.</p>
          {data.concentrations.length?<ol>{data.concentrations.map(group=><li key={group.key} style={{marginBottom:8}}><button style={button} onClick={()=>choose(group.key)}>{group.label} · {group.caseIds.length} cases / {group.orderCount} orders</button></li>)}</ol>:<p>No qualifying concentration is established{report.state==='partial'?' while reads are incomplete':' for this cohort'}.</p>}
        </section>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',background:'#fff'}}><caption style={{textAlign:'left',paddingBottom:8}}>All groups, including isolated cases. Monetary columns show known allocated values only.</caption><thead><tr>{[labels[dimension],'Distinct cases / orders','Cohort share','Known money by currency','Inspect'].map(title=><th key={title} scope="col" style={cell}>{title}</th>)}</tr></thead><tbody>{data.groups.map(group=><tr key={group.key}><th scope="row" style={cell}>{group.label}</th><td style={cell}>{group.caseIds.length} / {group.orderCount}</td><td style={cell}>{group.share===null?'Unavailable':`${(group.share*100).toFixed(1)}%`}</td><td style={cell}><Amounts rows={group.amounts}/></td><td style={cell}><button style={button} onClick={()=>choose(group.key)}>View {group.caseIds.length} cases</button></td></tr>)}</tbody></table></div>
        <section aria-label="Unallocated money"><h2 style={{fontSize:15}}>Unallocated money · {data.unallocatedCount} cases</h2><Amounts rows={data.unallocated}/><p>Ambiguous, unconfirmed and multi-group cases keep their money here. Nothing is divided equally or repeated across groups.</p></section>
        <section aria-label="Supporting cases"><header style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:12}}><h2 style={{fontSize:15,flex:1}}>Supporting cases · {selection?.label??'Entire cohort'} · {cases.length}</h2>{selected!==null?<button style={button} onClick={()=>choose(null)}>Show entire cohort</button>:null}{canExport?<a style={button} href={`/api/reports/claims?${exportParams}`}>Export these cases</a>:<span>Export permission required</span>}</header>
          <p>Existing active Work is shown before investigation review. Review opens the case’s permissioned investigation controls; no task is created by this report.</p>
          {cases.length===0?<p>No cases in this scope.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Case and evidence','Canonical order','Existing active Work','Next action'].map(title=><th key={title} scope="col" style={cell}>{title}</th>)}</tr></thead><tbody>{cases.slice((page-1)*50,page*50).map(row=><tr key={row.id}><td style={cell}><Link href={`/cases/${encodeURIComponent(row.id)}`}>{shortRef(null,row.id)}</Link>{row.evidenceHrefs.map((url,i)=><div key={url}><Link href={url}>Affected shipment {i+1}</Link></div>)}</td><td style={{...cell,fontFamily:mono}}>{row.orderId?<Link href={`/orders/${encodeURIComponent(row.orderId)}`}>{row.orderId}</Link>:'Not established'}</td><td style={cell}>{!report.workAvailable?'Work unavailable; retry before creating an investigation':row.work.length?row.work.map(task=><div key={task.id}><Link href={`/cases/${encodeURIComponent(row.id)}?tab=responsibility`}>{task.title}</Link> · {task.status.replaceAll('_',' ')}</div>):'No active Work recorded'}</td><td style={cell}>{canInvestigate && report.workAvailable?<Link href={`/cases/${encodeURIComponent(row.id)}?tab=responsibility`}>Review investigation</Link>:canInvestigate?'Refresh Work first':'Investigation permission required'}</td></tr>)}</tbody></table></div>}
          <footer style={{display:'flex',alignItems:'center',gap:12,marginTop:12}}><button style={button} disabled={page===1} onClick={()=>setPage(page-1)}>Previous</button><span>Page {page} of {Math.max(1,Math.ceil(cases.length/50))}</span><button style={button} disabled={page*50>=cases.length} onClick={()=>setPage(page+1)}>Next</button></footer>
        </section>
      </>:null}
    </div>
  </section>;
}
