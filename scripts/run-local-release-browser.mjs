import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ACCEPTANCE_ROOT, acceptanceRuntimeEnvironment } from './acceptance/local-runtime.mjs';

async function run(command, args, env, { captureName } = {}) {
  const capture = Boolean(captureName);
  const child = spawn(command, args, {
    cwd: process.cwd(),
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false,
    env,
  });
  let log;
  if (capture) {
    const logDir = path.join(process.cwd(), ACCEPTANCE_ROOT, 'performance');
    fs.mkdirSync(logDir, { recursive: true });
    log = fs.createWriteStream(path.join(logDir, captureName));
    child.stdout.on('data', (chunk) => { process.stdout.write(chunk); log.write(chunk); });
    child.stderr.on('data', (chunk) => { process.stderr.write(chunk); log.write(chunk); });
  }
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  if (log) await new Promise((resolve) => log.end(resolve));
  if (status !== 0) process.exit(status ?? 1);
}

try {
  const releaseBrowserPort = process.env.RELEASE_E2E_PORT?.trim() || '3016';
  const env = acceptanceRuntimeEnvironment({ host: '127.0.0.1', port: releaseBrowserPort });
  const runnerArgs = process.argv.slice(2);
  const reuseBuild = runnerArgs.includes('--reuse-build');
  const performanceOnly = runnerArgs.includes('--performance-only');
  const sharedStatesOnly = runnerArgs.includes('--shared-states-only');
  const p02StatesOnly = runnerArgs.includes('--p02-states-only');
  const p02WorkflowsOnly = runnerArgs.includes('--p02-workflows-only');
  const p03StatesOnly = runnerArgs.includes('--p03-states-only');
  const p03MutationsOnly = runnerArgs.includes('--p03-mutations-only');
  const p04StatesOnly = runnerArgs.includes('--p04-states-only');
  const p04WorkflowsOnly = runnerArgs.includes('--p04-workflows-only');
  const p05StatesOnly = runnerArgs.includes('--p05-states-only');
  const p05WorkflowsOnly = runnerArgs.includes('--p05-workflows-only');
  const p06SettingsOnly = runnerArgs.includes('--p06-settings-only');
  const p06AuditOnly = runnerArgs.includes('--p06-audit-only');
  const p06RemainingStatesOnly = runnerArgs.includes('--p06-remaining-states-only');
  const p06MutationsOnly = runnerArgs.includes('--p06-mutations-only');
  const p06PrivacyMutationsOnly = runnerArgs.includes('--p06-privacy-mutations-only');
  const p06BillingMutationOnly = runnerArgs.includes('--p06-billing-mutation-only');
  const p07EntryOnly = runnerArgs.includes('--p07-entry-only');
  const p07AuthOnly = runnerArgs.includes('--p07-auth-only');
  const rootNotFoundOnly = runnerArgs.includes('--root-not-found-only');
  const fileClaimOnly = runnerArgs.includes('--file-claim-only');
  const investigationsOnly = runnerArgs.includes('--investigations-only');
  const forwardedArgs = runnerArgs.filter((value) => value !== '--reuse-build' && value !== '--performance-only' && value !== '--shared-states-only' && value !== '--p02-states-only' && value !== '--p02-workflows-only' && value !== '--p03-states-only' && value !== '--p03-mutations-only' && value !== '--p04-states-only' && value !== '--p04-workflows-only' && value !== '--p05-states-only' && value !== '--p05-workflows-only' && value !== '--p06-settings-only' && value !== '--p06-audit-only' && value !== '--p06-remaining-states-only' && value !== '--p06-mutations-only' && value !== '--p06-privacy-mutations-only' && value !== '--p06-billing-mutation-only' && value !== '--p07-entry-only' && value !== '--p07-auth-only' && value !== '--root-not-found-only' && value !== '--file-claim-only' && value !== '--investigations-only');
  console.log('PASS isolated loopback environment for release-browser suite');
  await run('npm', ['run', 'prepare:release-e2e'], env);
  if (!reuseBuild) await run('npm', ['run', 'build:acceptance'], env);
  if (performanceOnly || sharedStatesOnly || p02StatesOnly || p02WorkflowsOnly || investigationsOnly || p03StatesOnly || p03MutationsOnly || p04StatesOnly || p04WorkflowsOnly || p05StatesOnly || p05WorkflowsOnly || p06SettingsOnly || p06AuditOnly || p06RemainingStatesOnly || p06MutationsOnly || p06PrivacyMutationsOnly || p06BillingMutationOnly || p07EntryOnly || p07AuthOnly || rootNotFoundOnly || fileClaimOnly) {
    const specs = performanceOnly
      ? ['tests/current/release-performance.spec.ts']
      : sharedStatesOnly
        ? ['tests/current/full-app-shared-states.spec.ts']
        : p02StatesOnly
          ? ['tests/current/full-app-p02-states.spec.ts']
          : investigationsOnly
            ? ['tests/current/full-app-p02-investigations.spec.ts']
          : p03StatesOnly
            ? ['tests/current/full-app-p03-states.spec.ts']
            : p03MutationsOnly
              ? ['tests/current/full-app-p03-mutations.spec.ts']
              : p04StatesOnly
                ? ['tests/current/full-app-p04-states.spec.ts']
                : p04WorkflowsOnly
                  ? ['tests/current/full-app-p04-workflows.spec.ts']
                  : p05StatesOnly
                    ? ['tests/current/full-app-p05-states.spec.ts']
                    : p05WorkflowsOnly
                      ? ['tests/current/full-app-p05-workflows.spec.ts']
                      : p06SettingsOnly
                        ? ['tests/current/full-app-p06-settings.spec.ts']
                        : p06AuditOnly
                          ? ['tests/current/full-app-p06-audit.spec.ts']
                          : p06RemainingStatesOnly
                            ? ['tests/current/full-app-p06-remaining-states.spec.ts']
                            : p06MutationsOnly
                              ? ['tests/current/full-app-p06-mutations.spec.ts']
                              : p06PrivacyMutationsOnly
                                ? ['tests/current/full-app-p06-privacy-mutations.spec.ts']
                                : p06BillingMutationOnly
                                  ? ['tests/current/full-app-p06-billing-mutation.spec.ts']
                                  : rootNotFoundOnly
                                    ? ['tests/current/full-app-root-not-found.spec.ts']
                                    : fileClaimOnly
                                      ? ['tests/current/full-app-file-claim.spec.ts']
                          : p07EntryOnly
                            ? ['tests/current/full-app-p07-entry.spec.ts', 'tests/current/full-app-pricing-plan-unavailable.spec.ts']
                            : p07AuthOnly
                              ? ['tests/current/full-app-p07-auth.spec.ts']
                  : ['tests/current/full-app-p02-workflows.spec.ts', 'tests/current/full-app-p02-investigations.spec.ts', 'tests/current/full-app-p02-delivery-photo.spec.ts', 'tests/current/full-app-p02-decisions.spec.ts'];
    const capturePrefix = performanceOnly
      ? 'release-performance'
      : sharedStatesOnly
        ? 'full-app-shared-states'
        : p02StatesOnly
          ? 'full-app-p02-states'
          : investigationsOnly
            ? 'full-app-p02-investigations'
          : p03StatesOnly
            ? 'full-app-p03-states'
            : p03MutationsOnly
              ? 'full-app-p03-mutations'
              : p04StatesOnly
                ? 'full-app-p04-states'
                : p04WorkflowsOnly
                  ? 'full-app-p04-workflows'
                  : p05StatesOnly
                    ? 'full-app-p05-states'
                    : p05WorkflowsOnly
                      ? 'full-app-p05-workflows'
                      : p06SettingsOnly
                        ? 'full-app-p06-settings'
                        : p06AuditOnly
                          ? 'full-app-p06-audit'
                          : p06RemainingStatesOnly
                            ? 'full-app-p06-remaining-states'
                            : p06MutationsOnly
                              ? 'full-app-p06-mutations'
                              : p06PrivacyMutationsOnly
                                ? 'full-app-p06-privacy-mutations'
                                : p06BillingMutationOnly
                                  ? 'full-app-p06-billing-mutation'
                                  : rootNotFoundOnly
                                    ? 'full-app-root-not-found'
                                    : fileClaimOnly
                                      ? 'full-app-file-claim'
                          : p07EntryOnly
                            ? 'full-app-p07-entry'
                            : p07AuthOnly
                              ? 'full-app-p07-auth'
                  : 'full-app-p02-workflows';
    await run('./node_modules/.bin/playwright', ['test', '--config=tests/playwright.config.ts', '--project=desktop', ...specs, ...forwardedArgs], env, { captureName: `${capturePrefix}-${Date.now()}.log` });
  } else {
    await run('npm', ['run', 'test:release-browser', '--', ...forwardedArgs], env, { captureName: `release-browser-${Date.now()}.log` });
  }
} catch (error) {
  console.error(`FAIL local release-browser environment: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
