/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react';
import { ClaimPatternsView } from '@/components/reports/ClaimPatternsView';
import type { PatternReport } from '@/lib/reporting/claimPatterns';
jest.mock('@/components/navigation/AppNavLink',()=>({__esModule:true,default:({children,...props}:any)=><a {...props}>{children}</a>}));
jest.mock('@/components/layout/SetBreadcrumbLabel',()=>({SetBreadcrumbLabel:()=>null}));
const report:PatternReport={from:'2026-08-08T00:00:00Z',to:'2026-09-07T00:00:00Z',readAt:'2026-09-07T00:00:00Z',timezone:'UTC',state:'complete',issues:[],workAvailable:true,cases:Array.from({length:55},(_,i)=>({id:`case-${i}`,orderId:`order-${i}`,submittedAt:'2026-09-01',groups:{issue:[{key:i<5?'missing':'damage',label:i<5?'Missing':'Damage'}],sku:[],warehouse:[],carrier:[]},allocationEligible:{issue:true,sku:false,warehouse:false,carrier:false},money:[],work:i===0?[{id:'work',title:'Check existing evidence',status:'open'}]:[],evidenceHrefs:[]}))};
test('drilldown changes exact rows, export selection, and pagination without a mutation',()=>{
 const previousFetch=global.fetch; const fetchMock=jest.fn().mockRejectedValue(new Error('Unexpected write')); global.fetch=fetchMock;
 render(<ClaimPatternsView report={report} dimension="issue" range="30d" fingerprint="hash" canInvestigate canExport/>);
 expect(screen.getByText('Page 1 of 2')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'View 5 cases'}));
 expect(screen.getByText('Page 1 of 1')).toBeTruthy();
 expect(screen.getByRole('link',{name:'Export these cases'}).getAttribute('href')).toContain('group=missing');
 expect(screen.getByText('Check existing evidence')).toBeTruthy();
 expect(screen.getAllByRole('link',{name:'Review investigation'})).toHaveLength(5);
 expect(fetchMock).not.toHaveBeenCalled();global.fetch=previousFetch;
});
test('permission denial and unavailable Work do not expose investigation controls',()=>{
 const {rerender}=render(<ClaimPatternsView report={report} dimension="issue" range="30d" fingerprint="hash" canInvestigate={false} canExport={false}/>);
 expect(screen.queryByRole('link',{name:'Review investigation'})).toBeNull();expect(screen.queryByRole('link',{name:'Export these cases'})).toBeNull();
 rerender(<ClaimPatternsView report={{...report,workAvailable:false}} dimension="issue" range="30d" fingerprint="hash" canInvestigate canExport/>);
 expect(screen.queryByRole('link',{name:'Review investigation'})).toBeNull();
});
