import { evaluateRules, normalizeRuleCondition, normalizeRuleOperator, OPERATOR_LABELS, type MerchantRule } from '@/lib/rules-engine';
import { mapRuleRow, updateRuleSchema } from '@/lib/rules/store';
import { validateConditions } from '@/lib/rules/fields';
import { evaluateSourceReadiness, sourceFreshnessState, type ReadinessSource } from '@/lib/sources/evidenceReadiness';

const aliases = { eq: ['equals','equal','=','==','==='], neq: ['not_equals','not_equal','!=','!==','<>'], gt: ['greater_than','>'], gte: ['greater_than_or_equal','greater_than_or_equals','>='], lt: ['less_than','<'], lte: ['less_than_or_equal','less_than_or_equals','<='] };
const base: MerchantRule = { id:'rule', merchant_id:'merchant', name:'Recorded rule', description:null, is_active:true, priority:7, condition_operator:'and', action:'approve', conditions:[] };

describe('P01 persisted rule meaning', () => {
  it.each(Object.keys(OPERATOR_LABELS))('preserves canonical operator %s', op => expect(normalizeRuleOperator(op)).toBe(op));
  it.each(Object.entries(aliases).flatMap(([canonical, list]) => list.map(alias => [alias, canonical])))('evaluates %s exactly as %s', (alias, canonical) => {
    const condition = { id:'c', field:'order_value_usd', operator:alias, value:70.25, unit:'USD' };
    expect(normalizeRuleCondition(condition)).toEqual({...condition, operator:canonical});
    expect(validateConditions([condition])).toEqual([]);
    for (const value of [0,70.25,99]) {
      const aliased = evaluateRules({order_value_usd:value}, [{...base, conditions:[condition]}]);
      const normalized = evaluateRules({order_value_usd:value}, [{...base, conditions:[{...condition,operator:canonical}]}]);
      expect(aliased.recommendation).toBe(normalized.recommendation);
    }
  });
  it.each(['and','or'] as const)('keeps %s, order, IDs, priority, units, arrays and extras across the persistence schema', grouping => {
    const stored = {...base, condition_operator:grouping, conditions:[{id:'one',field:'order_value_usd',operator:'less_than',value:70.25,unit:'USD'}, {id:'two',field:'claim_types',operator:'contains_any',value:['refund_request','item_not_received'], provenance:'retained'}]};
    const loaded = mapRuleRow(stored);
    const payload = updateRuleSchema.parse(loaded);
    const readBack = mapRuleRow({...stored,...payload});
    expect(readBack).toEqual({...stored,conditions:stored.conditions.map(normalizeRuleCondition)});
  });
  it.each(['mystery','__proto__','constructor'])('blocks unknown operator %s without equality fallback', operator => {
    const conditions = [{id:'bad',field:'order_value_usd',operator,value:0}];
    expect(normalizeRuleOperator(operator)).toBeNull();
    expect(validateConditions(conditions).length).toBeGreaterThan(0);
    expect(evaluateRules({order_value_usd:0},[{...base,conditions}]).recommendation).toBe('manual_review');
  });
  it('blocks malformed storage rather than treating it as an unconditional rule', () => expect(() => mapRuleRow({...base,conditions:null})).toThrow('blocked'));
});

const source: ReadinessSource = {id:'shopify',name:'Shopify',stage:'beta',status:'connected',badge:'healthy',connectionId:'local',evidenceCapabilities:[{id:'order_value',support:'supported',availability:'enabled'}],readModel:{configuration:'configured',operational:'healthy'}};
describe('P01 source observations', () => {
  it('does not infer freshness from enabled capabilities or healthy configuration', () => {
    expect(evaluateSourceReadiness([source])).toMatchObject({readyCount:1,currentCount:0});
    expect(sourceFreshnessState(source)).toBe('unavailable');
  });
  it.each(['stale','healthy'] as const)('keeps measured %s independent of configuration', badge => {
    const record = {...source,badge,readModel:{...source.readModel,freshnessConfidence:'measured' as const,lastDataReceivedAt:'2026-09-06T09:00:00Z'}};
    expect(sourceFreshnessState(record)).toBe(badge === 'stale' ? 'stale':'current');
    expect(evaluateSourceReadiness([record])).toMatchObject({readyCount:1,currentCount:badge === 'stale' ? 0:1});
  });
  it('keeps on-demand and unavailable observations distinct', () => {
    expect(sourceFreshnessState({...source,readModel:{...source.readModel,deliveryModel:'on_demand'}})).toBe('on_demand');
    expect(evaluateSourceReadiness([])).toMatchObject({readyCount:0,currentCount:0});
  });
});

describe('P01 search transport', () => {
  it('preserves an explicitly unknown total and rejects an absent result array', async () => {
    const { fetchSearchResults } = await import('@/components/layout/commandPaletteFetch');
    global.fetch = jest.fn().mockResolvedValue({ok:true,json:async()=>({results:[],total:null,coverage:'partial'})});
    expect(await fetchSearchResults('fixture')).toMatchObject({total:null,coverage:'partial'});
    global.fetch = jest.fn().mockResolvedValue({ok:true,json:async()=>({})});
    await expect(fetchSearchResults('fixture')).rejects.toThrow('unavailable');
  });
});

jest.mock('@/lib/supabase/server', () => ({createClient:jest.fn(),createServiceClient:jest.fn()}));
jest.mock('@/lib/supabase/scoped', () => ({createScopedClient:jest.fn()}));
jest.mock('@/lib/permissions', () => ({PERMISSIONS:{GENERATE_EVIDENCE:'generate_evidence'},requirePermission:jest.fn()}));
jest.mock('@/lib/evidence/buildPackage', () => ({buildEvidencePackage:jest.fn()}));
jest.mock('@/lib/evidence/narrative', () => ({buildNarrative:()=> 'Synthetic narrative'}));
jest.mock('@/lib/evidence/pdf', () => ({renderEvidencePDF:jest.fn()}));
jest.mock('@/lib/billing/contextUnlockFlow', () => ({precheckContextCredits:jest.fn(),spendContextCreditsAfterSuccess:jest.fn()}));
jest.mock('@/lib/customers/activityLog', () => ({writeActivityLog:jest.fn()}));
jest.mock('@/lib/evidence/cleanupArtifacts', () => ({deleteEvidencePackageArtifacts:jest.fn()}));
jest.mock('@/lib/ratelimit', () => ({enforceRateLimit:async()=>null,limitFromEnv:()=>({}),rateLimitKey:()=> 'local'}));
jest.mock('@/lib/log', () => ({createRequestLogger:()=>({error:jest.fn(),info:jest.fn(),warn:jest.fn()}),withRequestLogging:(_path:string,handler:unknown)=>handler}));
jest.mock('@/lib/sentry', () => ({captureServerException:jest.fn()}));
it('does not persist or charge a report when its artifact upload fails', async () => {
  const server=await import('@/lib/supabase/server');const scoped=await import('@/lib/supabase/scoped');
  const permissions=await import('@/lib/permissions');const build=await import('@/lib/evidence/buildPackage');
  const pdf=await import('@/lib/evidence/pdf');const credits=await import('@/lib/billing/contextUnlockFlow');
  const insert=jest.fn();
  (server.createClient as jest.Mock).mockReturnValue({auth:{getUser:async()=>({data:{user:{id:'local'}}})}});
  (server.createServiceClient as jest.Mock).mockReturnValue({storage:{from:()=>({upload:async()=>({error:{message:'local unavailable'}})})}});
  (scoped.createScopedClient as jest.Mock).mockReturnValue({from:insert});
  (permissions.requirePermission as jest.Mock).mockResolvedValue({ctx:{merchantId:'local',userId:'local',role:'owner'}});
  (build.buildEvidencePackage as jest.Mock).mockResolvedValue({referenceNumber:'P01-local'});
  (pdf.renderEvidencePDF as jest.Mock).mockResolvedValue(Buffer.from('local'));
  (credits.precheckContextCredits as jest.Mock).mockResolvedValue({ok:true});
  const {POST}=await import('@/app/api/evidence/route');
  const {NextRequest}=await import('next/server');
  const response=await POST(new NextRequest('http://127.0.0.1/api/evidence',{method:'POST',body:JSON.stringify({customerProfileId:'local',disputedOrderId:'local'})}));
  expect(response.status).toBe(502);
  expect(await response.json()).toMatchObject({error:expect.stringContaining('No credits were charged')});
  expect(insert).not.toHaveBeenCalled();
  expect(credits.spendContextCreditsAfterSuccess).not.toHaveBeenCalled();
});

it('discards document-scoped resources only after a successful workspace change', async () => {
  const reload=jest.fn();
  const previousWindow=global.window;
  Object.defineProperty(global,'window',{configurable:true,writable:true,value:{location:{reload}}});
  let resolve!:(value:unknown)=>void;
  global.fetch=jest.fn().mockImplementation(()=>new Promise(done=>{resolve=done;}));
  let control:any;
  try {
    jest.isolateModules(()=>{
      jest.doMock('react',()=>({...jest.requireActual('react'),useState:(value:unknown)=>[value,()=>{}],useRef:(value:unknown)=>({current:value}),useEffect:()=>{},useSyncExternalStore:()=>false}));
      jest.doMock('next/navigation',()=>({useRouter:()=>({push:jest.fn(),refresh:jest.fn()}),useSearchParams:()=>new URLSearchParams()}));
      jest.doMock('@/components/layout/BreadcrumbOverrideContext',()=>({useBreadcrumbOverride:()=>null,useBreadcrumbDetailOverride:()=>null,useBreadcrumbParentOverride:()=>null}));
      const {ExactAuthenticatedShell}=require('@/components/layout/ExactAuthenticatedShell');
      const tree=ExactAuthenticatedShell({children:null,pathname:'/search',workspaceName:'Local A',workspaces:[{id:'a',name:'Local A',role:'owner'},{id:'b',name:'Local B',role:'owner'}],activeMerchantId:'a',userName:'Local actor',userRole:'owner',permissions:[],sourceTone:'neutral',sourceLabel:'Unavailable'});
      function find(node:any):any{if(!node)return null;if(Array.isArray(node))return node.map(find).find(Boolean);if(node.props?.['aria-label']==='Switch workspace')return node;return find(node.props?.children);}
      control=find(tree);
    });
    expect(control).toBeTruthy();control.props.onClick();expect(reload).not.toHaveBeenCalled();
    resolve({ok:false});await Promise.resolve();await Promise.resolve();expect(reload).not.toHaveBeenCalled();
    control.props.onClick();expect(reload).not.toHaveBeenCalled();resolve({ok:true});await Promise.resolve();await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/workspace',expect.objectContaining({method:'POST',body:JSON.stringify({merchantId:'b'})}));
  } finally {
    Object.defineProperty(global,'window',{configurable:true,writable:true,value:previousWindow});
    jest.dontMock('react');jest.dontMock('next/navigation');jest.dontMock('@/components/layout/BreadcrumbOverrideContext');
  }
});
