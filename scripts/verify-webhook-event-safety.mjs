import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const config = readFileSync('supabase/config.toml', 'utf8');
const projectId = config.match(/^project_id\s*=\s*"([A-Za-z0-9_-]+)"/m)?.[1];
if (!projectId) throw new Error('Could not resolve a safe local project_id from supabase/config.toml');

const dbContainer = `supabase_db_${projectId}`;
const psqlArgs = ['exec', '-i', dbContainer, 'psql', '-U', 'postgres', '-d', 'postgres', '-X'];

function runSyncSql(sql, label) {
  const result = spawnSync('docker', psqlArgs, {
    cwd: process.cwd(),
    encoding: 'utf8',
    input: sql,
    maxBuffer: 16 * 1024 * 1024,
    shell: false,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.status !== 0) {
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${label} failed with status ${result.status}`);
  }
}

function runConcurrentClaim(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [...psqlArgs, '-Atq'], {
      cwd: process.cwd(),
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`concurrent claim failed (${code}): ${stderr.trim()}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(new Error(`concurrent claim returned invalid JSON: ${stdout.trim()}`));
      }
    });
    child.stdin.end(sql);
  });
}

runSyncSql(
  readFileSync('scripts/verify-webhook-event-safety.sql', 'utf8'),
  'Webhook event safety sequential acceptance',
);

const concurrencyKey = `runtime:concurrent:${randomUUID()}`;
const claimSql = `select public.claim_processed_webhook('${concurrencyKey}', 'runtime', 'account-a', 'order.updated', '${'9'.repeat(64)}', 300)::text;\n`;

try {
  const results = await Promise.all([runConcurrentClaim(claimSql), runConcurrentClaim(claimSql)]);
  const statuses = results.map((result) => result.status).sort();
  if (statuses.join(',') !== 'claimed,in_progress') {
    throw new Error(`concurrent delivery was not single-owner: ${JSON.stringify(results)}`);
  }
  console.log('Concurrent duplicate acceptance passed (one claimed, one in_progress).');
} finally {
  runSyncSql(
    `delete from public.processed_webhooks where idempotency_key = '${concurrencyKey}';\n`,
    'Webhook concurrency cleanup',
  );
}

const objectRun = randomUUID();
const objectKey = `order:${objectRun}`;
const objectDeliveryA = `runtime:object-concurrent-a:${objectRun}`;
const objectDeliveryB = `runtime:object-concurrent-b:${objectRun}`;
const objectClaimA = `select public.claim_processed_webhook('${objectDeliveryA}', 'runtime', 'account-a', 'order.updated', '${'7'.repeat(64)}', 300, '${objectKey}', 100)::text;\n`;
const objectClaimB = `select public.claim_processed_webhook('${objectDeliveryB}', 'runtime', 'account-a', 'order.updated', '${'8'.repeat(64)}', 300, '${objectKey}', 200)::text;\n`;

try {
  const results = await Promise.all([
    runConcurrentClaim(objectClaimA),
    runConcurrentClaim(objectClaimB),
  ]);
  const statuses = results.map((result) => result.status).sort();
  if (statuses.join(',') !== 'busy,claimed') {
    throw new Error(`concurrent object versions were not serialized: ${JSON.stringify(results)}`);
  }
  console.log('Concurrent object ordering acceptance passed (one claimed, one busy).');
} finally {
  runSyncSql(
    `delete from public.processed_webhooks where idempotency_key in ('${objectDeliveryA}', '${objectDeliveryB}');\n`,
    'Webhook object concurrency cleanup',
  );
}

console.log(`Webhook event safety runtime passed against ${dbContainer}.`);
