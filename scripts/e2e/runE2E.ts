import './helpers/loadEnv'; // MUST be first.

import { SCENARIOS, type Scenario, type ScenarioContext } from './scenarios';
import { runPreflight } from './preflight';
import { getVar } from './helpers/envVars';
import { AssertionError, blank, colors, rule } from './helpers/log';

type Args = { skipPreflight: boolean; scenario: number | null };

function parseArgs(argv: string[]): Args {
  let skipPreflight = false;
  let scenario: number | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--skip-preflight') skipPreflight = true;
    else if (a === '--scenario') {
      const n = Number(argv[i + 1]);
      if (Number.isInteger(n)) scenario = n;
      i += 1;
    } else if (a.startsWith('--scenario=')) {
      const n = Number(a.split('=')[1]);
      if (Number.isInteger(n)) scenario = n;
    }
  }
  return { skipPreflight, scenario };
}

function pad2(n: number): string {
  return String(n).padStart(2, ' ');
}

function selectScenarios(only: number | null): Scenario[] {
  if (only == null) return SCENARIOS;
  const target = SCENARIOS.find((s) => s.num === only);
  if (!target) {
    throw new Error(`No scenario #${only} (valid: 1–${SCENARIOS.length})`);
  }
  // Scenario 1 always runs first to set up the connection.
  if (only === 1) return [target];
  const first = SCENARIOS.find((s) => s.num === 1)!;
  return [first, target];
}

function fmt(value: unknown): string {
  if (typeof value === 'string') return `'${value}'`;
  return JSON.stringify(value);
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  rule();
  console.log('Unauth E2E Integration Suite');
  rule();

  let merchantIdB = getVar('E2E_MERCHANT_ID_B') ?? null;

  if (!args.skipPreflight) {
    console.log('Running preflight...');
    const pre = await runPreflight();
    if (!pre.ok) {
      console.log(colors.red('✗ Preflight failed'));
      return 1;
    }
    merchantIdB = pre.merchantIdB ?? merchantIdB;
    console.log(colors.green('✓ Preflight passed'));
  } else {
    console.log('Skipping preflight (--skip-preflight)');
  }

  const merchantId = getVar('E2E_MERCHANT_ID');
  if (!merchantId) {
    console.log(colors.red('✗ E2E_MERCHANT_ID is required'));
    return 1;
  }

  const ctx: ScenarioContext = { merchantId, merchantIdB };
  const toRun = selectScenarios(args.scenario);

  let passed = 0;
  let failed = 0;
  const startedAll = Date.now();

  for (const scenario of toRun) {
    blank();
    console.log(`${colors.cyan('▶')} Scenario ${pad2(scenario.num)} — ${scenario.title}`);
    const started = Date.now();
    try {
      await scenario.run(ctx);
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`${colors.green('✓')} Scenario ${pad2(scenario.num)} passed (${secs}s)`);
      passed += 1;
    } catch (err) {
      failed += 1;
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`${colors.red('✗')} Scenario ${pad2(scenario.num)} FAILED (${secs}s)`);
      if (err instanceof AssertionError) {
        console.log(`  Expected: ${err.message} = ${fmt(err.expected)}`);
        console.log(`  Received: ${fmt(err.received)}`);
        if (err.hint) console.log(`  Hint: ${err.hint}`);
      } else {
        console.log(`  Error: ${err instanceof Error ? err.message : String(err)}`);
      }
      // Scenario 1 is the foundation — abort the rest if it fails.
      if (scenario.num === 1) {
        console.log('  Scenario 1 is required by all others — aborting.');
        break;
      }
    }
  }

  const total = ((Date.now() - startedAll) / 1000).toFixed(1);
  blank();
  rule();
  const summary = `${passed}/${passed + failed} passed  ·  total: ${total}s`;
  console.log(failed === 0 ? colors.green(summary) : colors.red(summary));
  rule();

  return failed === 0 ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
