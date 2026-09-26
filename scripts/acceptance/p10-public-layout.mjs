import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
const root = 'artifacts/merchant-clarity-implementation/2026-09-07-p10/P10/browser';
const browser = await chromium.launch({headless:true});
const results=[];
try {
 const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(60000);
 for(const width of [1024,1280,1440]) {
  await page.setViewportSize({width,height:width===1024?600:720});await page.goto('http://127.0.0.1:3000/landing');await page.getByRole('heading',{name:'Decide claims confidently. Know who owes you.'}).waitFor();
  assert(await page.getByRole('region',{name:'Product preview: fictional damage claim'}).count());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${root}/landing-${width}.png`,fullPage:true});
 }
 results.push('final landing product preview at 1024/600, 1280/720 and 1440/720');
 await page.goto('http://127.0.0.1:3000/demo?case=duplicate&step=decide');
 await page.getByRole('button',{name:'Review goodwill exception',exact:true}).click();await page.locator('[data-overlay-open="true"] [role="dialog"]').waitFor();
 await page.waitForFunction(()=>!!document.activeElement?.closest('[role=dialog]'));
 for(let n=0;n<10;n++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement?.closest('[role=dialog]')));}
 await page.getByLabel('Goodwill rationale (required)').fill('Reviewed exception in this fictional case.');
 await page.waitForFunction(() => Array.from(document.querySelectorAll('button')).some(b => b.textContent?.trim() === 'Confirm simulated decision' && !b.disabled));
 await page.screenshot({path:`${root}/goodwill-review.png`,fullPage:false});
 await page.keyboard.press('Escape');await page.locator('[role="dialog"]').waitFor({state:'detached'});
 await page.waitForFunction(()=>document.activeElement?.textContent?.trim()==='Review goodwill exception');
 results.push('goodwill review traps keyboard focus, Escape cancels and restores focus');
 await page.evaluate(()=>{document.body.style.zoom='2'});
 assert.equal(await page.locator('[data-desktop-required="unsupported-portable"]').count(),0);
 await page.screenshot({path:`${root}/demo-css-zoom-200.png`,fullPage:true});
 results.push('200 percent CSS zoom retains desktop workflow; native browser zoom remains unverified');
 const failed=await browser.newContext();await failed.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('blocked','SecurityError')}});const p=await failed.newPage();
 await p.goto('http://127.0.0.1:3000/demo?case=legitimate&step=decide');await p.getByRole('button',{name:'Review refund',exact:true}).click();await p.getByRole('button',{name:'Confirm simulated decision'}).click();await p.getByRole('alert').filter({hasText:'Progress could not be saved'}).waitFor();assert(await p.getByRole('heading',{name:'Simulated decision: Refund',exact:true}).count());
 await p.getByRole('button',{name:'Duplicate payout',exact:true}).click();await p.getByRole('button',{name:'Legitimate claim',exact:true}).click();await p.getByRole('button',{name:'3. Outcome',exact:true}).click();await p.getByRole('heading',{name:'Simulated decision: Refund',exact:true}).waitFor();
 results.push('storage write failure preserves current decision across case switching and announces failed persistence');
 await failed.close();await context.close();
} finally {writeFileSync(`${root}/layout-receipt.json`,JSON.stringify(results,null,2));await browser.close()}
console.log(JSON.stringify(results,null,2));
