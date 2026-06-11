import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewportSize: { width: 1600, height: 1000 } });
await p.goto('http://localhost:3000/landing', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: '/tmp/motion_a7_cta_strip.png', clip: { x: 0, y: 870, width: 1600, height: 130 } });
await p.screenshot({ path: '/tmp/motion_a7_full0.png' });
await b.close();
