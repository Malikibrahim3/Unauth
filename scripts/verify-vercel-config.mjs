import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const errors = [];
const configPath = resolve(root, 'vercel.json');
if (!existsSync(configPath)) {
  console.error('Vercel verification failed: vercel.json is missing.');
  process.exit(1);
}

let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(`Vercel verification failed: invalid JSON (${error.message}).`);
  process.exit(1);
}

const crons = Array.isArray(config.crons) ? config.crons : [];
if (!crons.length) errors.push('vercel.json declares no cron routes.');
for (const cron of crons) {
  const path = typeof cron?.path === 'string' ? cron.path : '';
  if (!path.startsWith('/api/cron/')) {
    errors.push(`Cron path is not an API cron route: ${path || '(missing)'}`);
    continue;
  }
  const routePath = resolve(root, `app${path}/route.ts`);
  if (!existsSync(routePath)) {
    errors.push(`Cron route does not exist for ${path}: ${routePath}`);
    continue;
  }
  const source = readFileSync(routePath, 'utf8');
  if (!source.includes('CRON_SECRET')) errors.push(`${path} does not reference CRON_SECRET.`);
  if (!/status\s*:\s*401|status:\s*401|Unauthorized/.test(source)) errors.push(`${path} has no explicit unauthorized response.`);
}

if (errors.length) {
  console.error(`Vercel verification failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`PASS Vercel cron configuration (${crons.length} authenticated routes).`);
