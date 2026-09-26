/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SourcesOperations } from '@/components/sources/SourcesOperations';
import type { CatalogueRowItem } from '@/lib/integrations/catalogueView';
import PricingRuntime from '@/components/visual-authority/PricingRuntime';
import ResetPage from '@/app/(auth)/reset/page';
import BillingSettingsClient from '@/components/billing/BillingSettingsClient';
import { RuleBuilderDrawer } from '@/components/rules/RuleBuilderDrawer';
import { BreadcrumbOverrideProvider, useBreadcrumbOverride, useBreadcrumbLabel } from '@/components/layout/BreadcrumbOverrideContext';
import { PLANS, PUBLIC_PLAN_IDS, BILLABLE_EVENTS } from '@/lib/billing/plans';
import type { MerchantRule } from '@/lib/rules-engine';
let pathname = '/reset';
let query = '';
let params = new URLSearchParams();
function searchParams(){if(params.toString()!==query)params=new URLSearchParams(query);return params;}
const resetPasswordForEmail = jest.fn();
jest.mock('@/lib/supabase/client', () => ({createClient: () => ({auth:{resetPasswordForEmail}})}));
jest.mock('next/navigation', () => ({usePathname:()=>pathname,useSearchParams:searchParams,useRouter:()=>({push:jest.fn(),refresh:jest.fn()})}));
jest.mock('@/components/settings/SettingsPageShell', () => ({SettingsPageShell:({children,toolbar}:{children:React.ReactNode;toolbar:React.ReactNode})=><main>{toolbar}{children}</main>}));
afterEach(() => {cleanup(); jest.clearAllMocks(); query='';});

it('renders all prices, allowances, limits and event costs from the canonical catalogue', () => {
  render(<PricingRuntime requestedPlanUnavailable={false}/>);
  for (const id of PUBLIC_PLAN_IDS) {
    const plan=PLANS[id];const card=screen.getByRole('article',{name:`${plan.name} plan`});
    expect(card).toHaveTextContent(plan.priceGbp==='custom'?'Custom':`£${plan.priceGbp}`);
    expect(within(card).getByRole('link')).toHaveAttribute('href',`/signup?plan=${id}`);
    for(const feature of plan.publicFeatures)expect(card).toHaveTextContent(feature);
  }
  for(const event of Object.values(BILLABLE_EVENTS))expect(screen.getByText(`${event.label} · ${event.credits} credit${event.credits===1?'':'s'}`)).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent('£99');
  expect(document.body).not.toHaveTextContent('Most popular');
  expect(document.body).toHaveTextContent('Standalone reports not included');
});
it('shows reset success only after the stub succeeds and blocks duplicate pending submission', async () => {
  let resolve!:(value:unknown)=>void;
  resetPasswordForEmail.mockReturnValue(new Promise(r=>{resolve=r;}));
  render(<ResetPage/>);
  expect(document.body).not.toHaveTextContent('Recovery instructions requested');
  expect(document.body).not.toHaveTextContent('a link is on its way');
  fireEvent.change(screen.getByLabelText('Email'),{target:{value:'local@example.test'}});
  fireEvent.click(screen.getByRole('button',{name:'Send the link'}));
  expect(screen.getByRole('button',{name:'Sending…'})).toBeDisabled();
  expect(document.body).not.toHaveTextContent('Recovery instructions requested');
  await act(async()=>resolve({error:null}));
  expect(screen.getByRole('status')).toHaveTextContent('If local@example.test has an account');
  expect(resetPasswordForEmail).toHaveBeenCalledTimes(1);
});
it('keeps thrown reset failures out of success state and cancel does not request a link', async () => {
  resetPasswordForEmail.mockRejectedValue(new Error('offline'));
  render(<ResetPage/>);
  expect(screen.getAllByRole('link').some(link=>link.getAttribute('href')?.startsWith('/login'))).toBe(true);
  expect(resetPasswordForEmail).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Email'),{target:{value:'local@example.test'}});
  fireEvent.click(screen.getByRole('button',{name:'Send the link'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
  expect(document.body).not.toHaveTextContent('Recovery instructions requested');
});
it('opening a billing return URL neither submits a change nor infers payment', async () => {
  query='checkout=success&topup=success';
  const fetchMock=jest.fn().mockResolvedValue({ok:true,json:async()=>({planId:'growth',planName:'Outdated name',priceGbp:99,status:'active',totalRemaining:200,monthlyAllowance:2000,usedThisCycle:1800,currentPeriodEnd:'2026-10-01',cycleResetAt:'2026-10-01',subscriptionIntent:null})});
  global.fetch=fetchMock;
  render(<BillingSettingsClient/>);
  expect(await screen.findByText(/No credit increase is inferred/)).toBeInTheDocument();
  expect(fetchMock.mock.calls.every(([url])=>url==='/api/billing')).toBe(true);
  expect(document.body).not.toHaveTextContent('£99');
  fireEvent.click(screen.getByRole('button',{name:'Choose Pro'}));
  const dialog=screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('Current — Growth: £599');
  expect(dialog).toHaveTextContent('Requested — Pro: £249');
  expect(dialog).toHaveTextContent('1,000 context credits');
  expect(dialog).toHaveTextContent('downgrade is scheduled for renewal');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('normalises a legacy no-op draft and preserves money units and priority', async () => {
  const rule:MerchantRule={id:'fixture',merchant_id:'fixture',name:'Rule',description:null,is_active:true,priority:9,conditions:[{id:'c',field:'order_value_usd',operator:'less_than',value:70.25}],condition_operator:'or',action:'approve'};
  const onSubmit=jest.fn().mockResolvedValue(true);
  render(<RuleBuilderDrawer open mode="edit" initialRule={rule} onClose={jest.fn()} onSubmit={onSubmit}/>);
  expect(screen.getAllByRole('combobox').some(select=>(select as HTMLSelectElement).value==='lt')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Save rule'}));
  await act(async()=>{});
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({priority:9,condition_operator:'or',conditions:[{...rule.conditions[0],operator:'lt'}]}),'fixture');
});
it('blocks an unsupported operator without displaying an equality selection', () => {
  const rule:MerchantRule={id:'fixture',merchant_id:'fixture',name:'Rule',description:null,is_active:true,priority:1,conditions:[{id:'c',field:'order_value_usd',operator:'mystery',value:70.25}],condition_operator:'and',action:'approve'};
  render(<RuleBuilderDrawer open mode="edit" initialRule={rule} onClose={jest.fn()} onSubmit={jest.fn()}/>);
  expect(screen.getByRole('button',{name:'Save rule'})).toBeDisabled();
  expect(document.body).toHaveTextContent('mystery');
});
function Label({name}:{name:string|null}){useBreadcrumbLabel(name);return null;}
function ReadLabel(){return <output data-testid="label">{useBreadcrumbOverride()??'Unavailable'}</output>;}
it('scopes a retained breadcrumb to its pathname during sequential navigation', () => {
  pathname='/customers/a';
  const view=render(<BreadcrumbOverrideProvider><Label name="Customer A"/><ReadLabel/></BreadcrumbOverrideProvider>);
  expect(screen.getByTestId('label')).toHaveTextContent('Customer A');
  pathname='/customers/b';
  view.rerender(<BreadcrumbOverrideProvider><ReadLabel/></BreadcrumbOverrideProvider>);
  expect(screen.getByTestId('label')).toHaveTextContent('Unavailable');
});

it('renders configured-but-stale sources without calling their layers current', () => {
  const source:CatalogueRowItem={id:'shopify',name:'Shopify',description:'Fixture orders',category:'commerce',authMode:'oauth',stage:'beta',runtimeVerificationPending:true,pendingRuntimeCapabilities:[],status:'connected',syncState:'stale',freshness:{confidence:'measured',deliveryModel:'webhook',lastDataReceivedAt:'2026-08-01T10:00:00Z',lastSyncAttemptAt:null},connectionId:'fixture',connectionCount:1,account:'fixture.myshopify.com',lastSyncAttemptAt:null,lastSuccessfulSyncAt:'2026-08-01T10:00:00Z',lastDataReceivedAt:'2026-08-01T10:00:00Z',lastVerifiedAt:null,lastError:null,importedRecords:42,importedRecordsKnown:true,scopes:[],capabilities:[],evidenceCapabilities:[{id:'order_value',support:'supported',availability:'enabled'}],connectEnabled:true,badge:'stale',noteTone:null};
  render(<SourcesOperations view="connected" items={[source]}/>);
  expect(document.body).toHaveTextContent('1 layers are configured');
  expect(document.body).toHaveTextContent('0 have a current source observation');
  expect(document.body).toHaveTextContent('freshness stale');
  expect(screen.getByText('STALE')).toBeInTheDocument();
});

it.each(PUBLIC_PLAN_IDS)('keeps the %s billing catalogue consistent with public custom terms', async id => {
  const plan=PLANS[id];
  global.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({planId:id,planName:plan.name,priceGbp:plan.priceGbp,status:'active',totalRemaining:100,monthlyAllowance:plan.creditsMonthly==='custom'?null:plan.creditsMonthly,usedThisCycle:0,currentPeriodEnd:null,cycleResetAt:'2026-10-01',subscriptionIntent:null})});
  render(<BillingSettingsClient/>);
  for(const candidateId of PUBLIC_PLAN_IDS){const candidate=PLANS[candidateId];const row=await screen.findByRole('region',{name:`${candidate.name} plan`});expect(row).toHaveTextContent(candidate.priceGbp==='custom'?'Talk to us':`£${candidate.priceGbp}`);}
  expect(document.body).not.toHaveTextContent('unlimited');
  expect(document.body).toHaveTextContent('Agreed');
  expect(document.body).toHaveTextContent('Prices are monthly, in GBP, excluding VAT');
});
