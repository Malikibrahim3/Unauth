import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { acceptanceRuntimeEnvironment, runtimeSourceFingerprint } from './local-runtime.mjs';

const env = acceptanceRuntimeEnvironment({ port: '3015' });
const namespace = process.argv[2] || crypto.randomUUID();
if (!/^[0-9a-f-]{36}$/.test(namespace)) throw new Error('Invalid namespace.');
const root = path.resolve('artifacts/merchant-clarity-implementation/2026-09-09-ui-forensics-01/P12/ui-forensics/continuations', `visual-${namespace}-${Date.now()}`);
fs.mkdirSync(root, { recursive: false });
env.UNAUTH_VISUAL_FIXTURE_NAMESPACE = namespace;
env.UNAUTH_PARITY_OUTPUT = path.join(root, 'parity');
env.VISUAL_PARITY_BASE_URL = 'http://127.0.0.1:3015';
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function retainedState() {
  const order = await client.from('source_orders').select('*').eq('id', '0001b458-83e8-4196-84a3-08737f775050').single();
  if (order.error) throw new Error(`Retained order read failed: ${order.error.code}`);
  return { orderHash: crypto.createHash('sha256').update(JSON.stringify(order.data)).digest('hex'), customerId: order.data.customer_id };
}
const before = await retainedState();
const receipt = { namespace, startedAt: new Date().toISOString(), runtimeSourceFingerprint: runtimeSourceFingerprint(), build: JSON.parse(fs.readFileSync('artifacts/full-app-acceptance-2026-08-30/build-environment.json', 'utf8')), before, fixtureDisposition: 'Isolated marked visual/onboarding fixtures retained with this run manifest for reproducible parity; existing release records read-only.' };
fs.writeFileSync(path.join(root, 'run.json'), JSON.stringify(receipt, null, 2));
console.log(`Isolated parity evidence: ${root}`);
const log = fs.createWriteStream(path.join(root, 'capture.log'));
const child = spawn(process.execPath, ['scripts/capture-reference-parity.mjs', path.join(root, 'fixture-manifest.json')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
for (const stream of [child.stdout, child.stderr]) stream.on('data', bytes => {
  let text = String(bytes);
  for (const key of ['E2E_AUTH_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) if (env[key]) text = text.replaceAll(env[key], '[redacted]');
  log.write(text); process.stdout.write(text);
});
const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('close', resolve); });
await new Promise(resolve => log.end(resolve));
receipt.after = await retainedState();
receipt.retainedOrderUnchanged = receipt.after.orderHash === before.orderHash;
receipt.completedAt = new Date().toISOString();
receipt.exitCode = code;
receipt.runtimeUnchanged = runtimeSourceFingerprint() === receipt.runtimeSourceFingerprint;
fs.writeFileSync(path.join(root, 'run.json'), JSON.stringify(receipt, null, 2));
if (!receipt.retainedOrderUnchanged || !receipt.runtimeUnchanged) throw new Error('Preservation verification failed.');
process.exitCode = code;
