import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_CASES, DEMO_GATE_PRESENTATION, DEMO_PRESENTATION, demoUrl } from '../../lib/demo/merchantCaseV1';

const labels: Record<string,string> = { legitimate:'Damaged item', duplicate:'Prior refund', recoverable:'Wrong item' };
const anchors=['product','workflow','evidence','sources','examples','recovery','money','controls','policy','availability','connections','faq'];
const captureDir=process.env.LANDING_CAPTURE_DIR;
test.beforeEach(async({page})=>{await page.goto('/landing',{waitUntil:'domcontentloaded'});await expect(page.locator('[data-landing-page]')).toBeVisible();});

test('preserves landmarks, entry destinations, metadata and unique anchors',async({page})=>{
 await expect(page.getByRole('heading',{level:1})).toHaveText('Your rules before money moves. Recover what you’re owed.');
 for(const id of anchors){await expect(page.locator(`#${id}`)).toHaveCount(1);expect((await page.locator(`#${id}`).innerText()).length).toBeGreaterThan(15);}
 for(const href of ['/pricing','/login','/landing/data','/legal/privacy','/legal/data-handling','/legal/pilot-terms','/legal/dpa','mailto:support@unauth.app'])expect(await page.locator(`a[href="${href}"]`).count()).toBeGreaterThan(0);
 await expect(page.getByRole('link',{name:'See it in action',exact:true}).first()).toHaveAttribute('href',demoUrl('recoverable'));
 await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content',/Turn customer claims into clear decisions/);
 await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute('content',/unauth-og-1200x630.png/);
 const image=page.locator('[data-story-artifact="hero-live-capture"] img');
 await expect(page.getByRole('link',{name:'View full-size image'})).toHaveAttribute('href',(await image.getAttribute('src'))!);
 await page.locator('main').getByRole('link',{name:'How it works',exact:true}).click();await expect(page).toHaveURL(/#workflow$/);
 await page.goBack();await expect(page).not.toHaveURL(/#workflow$/);await page.goForward();await expect(page).toHaveURL(/#workflow$/);
});

test('case selection changes its explanation and product illustration without writing demo progress or altering later examples',async({page})=>{
 const before=await page.evaluate(()=>JSON.stringify(localStorage));const writes:string[]=[];
 page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
 const tabs=page.getByRole('tablist',{name:'Customer situations'});
 await expect(tabs.getByRole('tab',{selected:true})).toHaveText('Wrong item');
 for(const sample of DEMO_CASES){
  await tabs.getByRole('tab',{name:labels[sample.id]}).click();const panel=page.getByRole('tabpanel',{name:labels[sample.id]});
  for(const text of [sample.reference,DEMO_PRESENTATION[sample.id].record,DEMO_PRESENTATION[sample.id].route,DEMO_GATE_PRESENTATION[sample.id].conciseRule,DEMO_GATE_PRESENTATION[sample.id].nextAction,'decision pending'])await expect(panel).toContainText(text);
  await expect(panel).toContainText('Example rule');
  await panel.getByText('More case facts and permitted options',{exact:true}).click();for(const fact of sample.facts)await expect(panel).toContainText(fact);
  if(sample.id==='legitimate')for(const amount of ['£96.00','£33.00','£28.00','£5.00'])await expect(panel).toContainText(amount);
  await expect(panel.getByRole('link',{name:'Explore this case'})).toHaveAttribute('href',demoUrl(sample.id));
  await expect(page.locator('#recovery')).toContainText('SAMPLE-248');await expect(page.locator('#money')).toContainText('SAMPLE-248');
 }
 await tabs.getByRole('tab',{selected:true}).press('Home');await expect(tabs.getByRole('tab').first()).toBeFocused();
 await tabs.getByRole('tab').first().press('ArrowLeft');await expect(tabs.getByRole('tab').last()).toBeFocused();
 await tabs.getByRole('tab').last().press('ArrowRight');await expect(tabs.getByRole('tab').first()).toBeFocused();
 await tabs.getByRole('tab').first().press('End');await expect(tabs.getByRole('tab').last()).toBeFocused();
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).toBe(before);expect(writes.filter(x=>/\/api\//.test(x))).toEqual([]);
});

test('keeps current recovery, later receipt and conditional reconciliation separate',async({page})=>{
 const recovery=page.locator('#recovery');for(const value of ['Not submitted','no receipt recorded','Amelia Reed','Merchant-set','Confirm who can claim and where to submit','ILLUSTRATIVE-SUBMISSION-248','not approved','approval is not payment'])await expect(recovery).toContainText(value);
 const money=page.locator('#money');for(const value of ['Current','Illustrative later receipt','Awaiting match','Illustrative outcome after verification','received, matched and reconciled','Not total loss or profit.','claimant and route must be confirmed'])await expect(money).toContainText(value);
 const bridge=money.locator('[data-story-artifact="reconciled-outcome"]');
 for(const [label,amount] of [['Refund paid','£248.00'],['Recovery reconciled','£150.00'],['Unrecovered refund balance','£98.00']])await expect(bridge.locator('dl > div').filter({hasText:label})).toContainText(amount);
 await expect(page.locator('[data-story-artifact="shared-case"]')).toContainText('Illustrative later receipt');
 await expect(page.locator('#connections')).toContainText('Courier tracking does not verify payment');
});

test('all anchor destinations clear the sticky header',async({page})=>{
 for(const id of anchors){await page.goto(`/landing#${id}`,{waitUntil:'domcontentloaded'});await expect(page.locator('[data-landing-page]')).toBeVisible();await page.evaluate(()=>document.fonts.ready);await page.locator(`#${id}`).evaluate(e=>e.scrollIntoView());
 const top=await page.locator(`#${id}`).evaluate(e=>e.getBoundingClientRect().top);const bottom=await page.locator('[data-landing-navigation] header').evaluate(e=>e.getBoundingClientRect().bottom);
 expect(top,`#${id} sticky clearance`).toBeGreaterThanOrEqual(bottom+19);}
});

test('native menu and disclosures remain keyboard operable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('tab',{name:'Wrong item'})).toBeEnabled();const summary=page.locator('header summary');await summary.press('Enter');await expect(page.locator('header details')).toHaveAttribute('open','');await summary.press('Escape');await expect(page.locator('header details')).not.toHaveAttribute('open','');await expect(summary).toBeFocused();
 const panel=page.getByRole('tabpanel',{name:'Wrong item'});await panel.getByText('More case facts and permitted options',{exact:true}).press('Enter');await expect(panel).toContainText(DEMO_CASES.find(item=>item.id==='recoverable')!.facts[0]);
});

test('static story survives JavaScript disabled and reduced motion',async({browser,baseURL})=>{
 const context=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce',viewport:{width:1440,height:900}});const page=await context.newPage();await page.goto(`${baseURL}/landing`,{waitUntil:'domcontentloaded'});
 await expect(page.getByRole('tabpanel',{name:'Wrong item'})).toBeVisible();await expect(page.locator('#evidence')).toContainText(DEMO_GATE_PRESENTATION.recoverable.conciseRule);
 for(const id of ['recovery','money','availability','controls'])await expect(page.locator(`#${id}`)).toBeVisible();
 await expect(page.getByRole('link',{name:/Explore this case on desktop/}).first()).toHaveAttribute('href',demoUrl('legitimate'));
 await expect(page.locator('#money')).toContainText('Illustrative outcome after verification');await context.close();
});

for(const width of [320,390,768,1024,1280,1440])test(`readable contained story at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:width>=1024?720:844});await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>document.fonts.ready);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const essential=page.locator('[role="tabpanel"]:not([hidden]) h4, [role="tabpanel"]:not([hidden]) strong, #recovery h4, #recovery dd, #money dd, #money h4');
 for(const item of await essential.all()){const box=await item.boundingBox();if(box){expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);}}
 if(captureDir){mkdirSync(captureDir,{recursive:true});await page.screenshot({path:join(captureDir,`full-${width}.png`),fullPage:true,animations:'disabled'});
 for(const id of ['sources','recovery','money','availability'])await page.locator(`#${id}`).screenshot({path:join(captureDir,`${id}-${width}.png`),animations:'disabled',style:'[data-landing-navigation]{visibility:hidden}'});}
});

test('failed images preserve explanation, provenance and destinations',async({browser,baseURL})=>{
 const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1280,height:720}});const page=await context.newPage();await page.route('**/*',r=>r.request().resourceType()==='image'?r.abort():r.continue());await page.goto(`${baseURL}/landing`);
 await expect(page.locator('[data-story-artifact="hero-live-capture"] img')).toHaveAttribute('alt',/Fictional Asterlane/);await expect(page.getByText('Customer claims and recovery.')).toBeVisible();await expect(page.locator('#sources')).toContainText('Wrong item received');await expect(page.locator('#recovery')).toContainText('Not submitted');await expect(page.getByRole('link',{name:'See it in action',exact:true}).first()).toHaveAttribute('href',demoUrl('recoverable'));await context.close();
});

test('records local loading, layout shift and case interaction samples',async({page},testInfo)=>{
 await page.addInitScript(()=>{const measurements={lcp:0,cls:0,events:[] as {duration:number;interactionId:number;name:string}[]};(window as unknown as {landingMeasurements:typeof measurements}).landingMeasurements=measurements;
 new PerformanceObserver(list=>{for(const entry of list.getEntries() as (PerformanceEntry&{interactionId?:number})[])if(entry.interactionId)measurements.events.push({duration:entry.duration,interactionId:entry.interactionId,name:entry.name});}).observe({type:'event',buffered:true,durationThreshold:16} as PerformanceObserverInit);
 new PerformanceObserver(list=>{for(const entry of list.getEntries())measurements.lcp=entry.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
 new PerformanceObserver(list=>{for(const entry of list.getEntries() as (PerformanceEntry&{hadRecentInput:boolean;value:number})[])if(!entry.hadRecentInput)measurements.cls+=entry.value;}).observe({type:'layout-shift',buffered:true});});
 await page.reload();await expect(page.locator('#sources')).toContainText('Wrong item received');await page.evaluate(()=>document.fonts.ready);
 const interactions=[];for(const sample of DEMO_CASES){const start=Date.now();await page.getByRole('tab',{name:labels[sample.id]}).click();await expect(page.getByRole('tabpanel')).toContainText(sample.reference);interactions.push({case:sample.id,automationRoundTripMs:Date.now()-start});}
 const metrics=await page.evaluate(()=>({...(window as unknown as {landingMeasurements:object}).landingMeasurements,resources:performance.getEntriesByType('resource').filter(e=>e.name.includes('/landing/')||e.name.includes('/_next/')).map(e=>({name:e.name,bytes:(e as PerformanceResourceTiming).encodedBodySize,duration:e.duration}))}));
 const result={runtime:process.env.LANDING_RUNTIME ?? 'development',metrics,interactions,qualification:'Single local run; automation latency is not INP. No p75 field verdict or comparable pre-change baseline.'};await testInfo.attach('landing-performance.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});if(captureDir){mkdirSync(captureDir,{recursive:true});writeFileSync(join(captureDir,'performance.json'),JSON.stringify(result,null,2));}
});

test('records visible copy for each default case and expanded FAQs',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByRole('tab',{name:'Wrong item'})).toBeEnabled();
 const counts:Record<string,number>={};
 const count=()=>page.locator('main').evaluate(element=>((element as HTMLElement).innerText.trim().match(/\S+/g)??[]).length);
 for(const sample of DEMO_CASES){
  await page.getByRole('tab',{name:labels[sample.id]}).click();
  counts[sample.id]=await count();
 }
 for(const question of await page.locator('#faq summary').all())await question.click();
 counts.faqExpanded=await count();
 const result={viewport:'390×844',browser:'Playwright Chrome',counts};
 await testInfo.attach('visible-word-counts.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 if(captureDir){mkdirSync(captureDir,{recursive:true});writeFileSync(join(captureDir,'visible-word-counts.json'),JSON.stringify(result,null,2));}
});

test('keyboard entry and expanded FAQ retain accessible names, focus and contrast',async({page},testInfo)=>{
  const runtimeErrors:string[]=[];
  page.on('pageerror',error=>runtimeErrors.push(error.message));
  await page.goto('/landing');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const question=page.locator('#faq summary').first();
  await question.press('Enter');
  await expect(page.locator('#faq details').first()).toHaveAttribute('open','');
  await expect(question).toBeFocused();
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const results=await page.evaluate(async()=>{
    const axe=(window as unknown as {axe:{run:(context:string,options:object)=>Promise<{violations:unknown[];incomplete:unknown[]}>}}).axe;
    return axe.run('[data-landing-page]',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
  });
  await testInfo.attach('accessibility-results',{body:JSON.stringify(results,null,2),contentType:'application/json'});
  expect(results.violations).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

test('desktop sample entry retains case, Inspect and browser Back', async ({ page }) => {
  await page.goto('/landing', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'See it in action', exact: true }).first().click();
  await expect(page).toHaveURL(/\/demo\?case=recoverable&step=inspect$/);
  await expect(page.getByRole('main')).toContainText('SAMPLE-248');
  await expect(page.locator('[data-demo-case]')).toHaveAttribute('data-demo-step', 'inspect');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/landing$/);
});

test('phone handoff preserves the sample destination without mounting the case', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' });
  const page = await context.newPage();
  await page.goto(`${baseURL}/landing`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'See it in action', exact: true }).first().click();
  await expect(page).toHaveURL(/\/demo\?case=recoverable&step=inspect$/);
  await expect(page.getByRole('heading', { name: /desktop/i }).first()).toBeVisible({timeout:15000});
  await expect(page.locator('[data-desktop-required="unsupported-portable"]')).toBeVisible();
  await expect(page.locator('[data-demo-case]')).toHaveCount(0);
  const emailLink = await page.getByRole('link', { name: 'Email the link' }).getAttribute('href');
  expect(decodeURIComponent(emailLink!)).toContain('/demo?case=recoverable&step=inspect');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/landing$/);
  await context.close();
});
