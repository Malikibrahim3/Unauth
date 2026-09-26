import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {requireRemainingClosurePlan,authenticateFixture} from './remainingClosureHelpers';
import {TABLES} from '@/lib/supabase/tables';

// These are explicitly synthetic status projections in a newly created merchant.
// No erasure function, Storage deletion or cleanup worker is invoked by this test.
test('Durable privacy status renders queued, blocked, completed and unavailable backup truth',async({page},info)=>{
  const plan=requireRemainingClosurePlan();const fixture=plan.fixtures.privacy;const service=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const original=await service.from(TABLES.MERCHANT_CUSTOMERS).select('id,email,display_name,erased_at').eq('id',fixture.subjectId!).eq('merchant_id',fixture.merchantId).single();expect(original.error).toBeNull();
  await page.setViewportSize({width:1024,height:600});await authenticateFixture(page,String(info.project.use.baseURL),fixture,'/settings/legal/data-privacy');
  const expected={pending:{storage:'queued',retry:true},failed:{storage:'queued',retry:true},dead_letter:{storage:'blocked',retry:false},completed:{storage:'completed',retry:false}} as const;
  const projections:unknown[]=[];
  for(const state of ['pending','failed','dead_letter','completed'] as const){
    const subjectId=randomUUID();const receiptId=randomUUID();const jobId=randomUUID();
    const absent=await service.from(TABLES.MERCHANT_CUSTOMERS).select('id').eq('id',subjectId);expect(absent.error).toBeNull();expect(absent.data).toEqual([]);
    const receipt=await service.from(TABLES.DATA_SUBJECT_ERASURE_RECEIPTS).insert({id:receiptId,merchant_id:fixture.merchantId,subject_reference:subjectId,idempotency_key:`forensic-status:${plan.runId}:${state}`,scope_counts:{synthetic_status_fixture:1},effective_at:'2026-09-01T00:00:00Z',meaning:'Synthetic local status fixture; no identifiers were erased.'});expect(receipt.error).toBeNull();
    if(state==='pending'){
      const update=await service.from(TABLES.DATA_SUBJECT_ERASURE_RECEIPTS).update({meaning:'Forbidden fixture update'}).eq('id',receiptId).eq('merchant_id',fixture.merchantId);expect(update.error?.message).toContain('append-only');
      const remove=await service.from(TABLES.DATA_SUBJECT_ERASURE_RECEIPTS).delete().eq('id',receiptId).eq('merchant_id',fixture.merchantId);expect(remove.error?.message).toContain('append-only');
      const preserved=await service.from(TABLES.DATA_SUBJECT_ERASURE_RECEIPTS).select('meaning').eq('id',receiptId).single();expect(preserved.error).toBeNull();expect(preserved.data?.meaning).toBe('Synthetic local status fixture; no identifiers were erased.');
    }
    const job=await service.from(TABLES.PRIVACY_STORAGE_CLEANUP_JOBS).insert({id:jobId,merchant_id:fixture.merchantId,erasure_receipt_id:receiptId,bucket:'forensic-no-objects',object_path:`${fixture.merchantId}/${plan.runId}/${jobId}/not-created`,status:state,attempts:state==='pending'?0:1,next_attempt_at:'2099-01-01T00:00:00Z',leased_until:'2099-01-01T00:00:00Z',completed_at:state==='completed'?'2026-09-01T00:01:00Z':null,last_error:state==='failed'||state==='dead_letter'?'Synthetic fixture error':null});expect(job.error).toBeNull();
    const response=await page.request.get(`/api/settings/data-subject-erasure?receiptId=${receiptId}`);expect(response.status()).toBe(200);const data=await response.json();expect(data.writesPerformed).toBe(0);expect(data.storageCleanup.totalJobs).toBe(1);expect(data.storageCleanup.retryable).toBe(expected[state].retry);expect(data.steps.find((step:{key:string})=>step.key==='storage').state).toBe(expected[state].storage);expect(data.steps.find((step:{key:string})=>step.key==='backupCycle').state).toBe('unavailable');
    await page.getByRole('textbox',{name:'CANONICAL CUSTOMER ID'}).fill(subjectId);await page.getByRole('button',{name:'Check status',exact:true}).click();const status=page.getByRole('region',{name:'Erasure status',exact:true});await expect(status).toContainText(receiptId);await expect(status).toContainText(expected[state].storage);await expect(status).toContainText('Backup-cycle status is not exposed by the current retention store and remains unavailable.');
    await status.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`receipt-${state}.png`)});projections.push({state,receiptId,jobId,subjectId,response:data});
    const cross=await page.request.get(`/api/settings/data-subject-access?subjectId=${subjectId}`);expect(cross.status()).toBe(404);
  }
  const after=await service.from(TABLES.MERCHANT_CUSTOMERS).select('id,email,display_name,erased_at').eq('id',fixture.subjectId!).eq('merchant_id',fixture.merchantId).single();expect(after.error).toBeNull();expect(after.data).toEqual(original.data);
  await info.attach('synthetic-receipt-projections',{body:JSON.stringify({planRunId:plan.runId,merchantId:fixture.merchantId,projections,originalSubjectUnchanged:true,noErasureExecuted:true,noStorageObjectsCreated:true,noWorkerExecution:true,appendOnlyUpdateAndDeleteRejected:true}),contentType:'application/json'});
});
