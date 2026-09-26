import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {requireRemainingClosurePlan,authenticateFixture} from './remainingClosureHelpers';

test('Resolution comparison cancel, immutable decision snapshot and idempotent replay',async({page,context},info)=>{
  const plan=requireRemainingClosurePlan();const fixture=plan.fixtures.privacy;const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const row=await service.from('support_payout_cases').select('id').eq('merchant_id',fixture.merchantId).single();expect(row.error).toBeNull();const caseId=row.data!.id;
  const base=new URL(String(info.project.use.baseURL));const external:string[]=[];
  await context.route(/^https?:\/\//,route=>{const url=new URL(route.request().url());if(['localhost','127.0.0.1'].includes(url.hostname))return route.continue();external.push(route.request().method()+' '+url.origin+url.pathname);return route.abort();});
  await page.setViewportSize({width:1024,height:600});await authenticateFixture(page,base.origin,fixture,`/cases/${caseId}`);
  await page.getByRole('button',{name:'Review merchant decision',exact:true}).click();const review=page.getByRole('dialog',{name:'Review merchant decision',exact:true});await expect(review.locator('[data-state-id="resolution-comparison-review"]')).toBeVisible();
  await review.getByLabel('Decision',{exact:true}).selectOption('escalate');await review.getByLabel('Decision rationale',{exact:true}).fill('Disposable forensic comparison review; another reviewer is required. No payout or provider action.');
  await review.getByRole('button',{name:'Review decision',exact:true}).click();const confirmation=page.getByRole('dialog',{name:'Record merchant decision',exact:true});await expect(confirmation).toBeVisible();await page.screenshot({path:info.outputPath('resolution-review.png')});
  await confirmation.getByRole('button',{name:'Cancel',exact:true}).click();await expect(confirmation).toHaveCount(0);
  const canceled=await service.from('case_decisions').select('id').eq('merchant_id',fixture.merchantId);expect(canceled.error).toBeNull();expect(canceled.data).toEqual([]);
  await review.getByRole('button',{name:'Review decision',exact:true}).click();const recorded=page.waitForResponse(r=>r.url().endsWith(`/api/claims/${caseId}/outcome`)&&r.request().method()==='POST');await confirmation.getByRole('button',{name:'Confirm & record',exact:true}).click();const response=await recorded;expect(response.ok(),await response.text()).toBe(true);
  const request=response.request();const replay=await page.request.post(`/api/claims/${caseId}/outcome`,{data:request.postDataJSON(),headers:{'idempotency-key':request.headers()['idempotency-key']}});expect(replay.ok(),await replay.text()).toBe(true);expect((await replay.json()).replayed).toBe(true);
  const decisions=await service.from('case_decisions').select('*').eq('merchant_id',fixture.merchantId);expect(decisions.error).toBeNull();expect(decisions.data).toHaveLength(1);expect(JSON.stringify(decisions.data![0])).toContain('resolution-comparison-v1');
  await page.reload();await expect(page.locator('[data-surface-id="case-review-workbench"]')).toBeVisible();expect(external).toEqual([]);
  await info.attach('resolution-decision-receipt',{body:JSON.stringify({fixture:fixture.merchantId,caseId,cancelNoWrite:true,replayed:true,decisions:decisions.data,noExternalRequests:true,limitation:'One escalation decision; other cost, replacement and permission branches are separate.'}),contentType:'application/json'});
});
