import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewportSize: { width: 1600, height: 1000 } });
await p.goto('http://localhost:3000/landing', { waitUntil: 'networkidle' });
await p.waitForTimeout(2000);
const top = await p.evaluate(() => {
  const e = document.elementFromPoint(200, 960);
  const chain = [];
  let n = e;
  while (n && n !== document.body) { chain.push(n.tagName + '.' + String(n.className).slice(0,80)); n = n.parentElement; }
  return chain;
});
console.log(JSON.stringify(top, null, 1));
await p.screenshot({ path: '/tmp/fidvis_ctabar.png', clip: {x:0,y:880,width:700,height:120} });
await b.close();
