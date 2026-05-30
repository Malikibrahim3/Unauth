/**
 * Console formatting + assertion helpers for the E2E suite.
 * Keeps output aligned with the spec's example formatting.
 */

const isTTY = process.stdout.isTTY;

const c = {
  green: (s: string) => (isTTY ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s: string) => (isTTY ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string) => (isTTY ? `\x1b[33m${s}\x1b[0m` : s),
  dim: (s: string) => (isTTY ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (isTTY ? `\x1b[1m${s}\x1b[0m` : s),
  cyan: (s: string) => (isTTY ? `\x1b[36m${s}\x1b[0m` : s),
};

export const RULE = '──────────────────────────────────────';

export function pass(msg: string): void {
  console.log(`  ${c.green('✓')} ${msg}`);
}
export function fail(msg: string): void {
  console.log(`  ${c.red('✗')} ${msg}`);
}
export function warn(msg: string): void {
  console.log(`  ${c.yellow('⚠')} ${msg}`);
}
export function info(msg: string): void {
  console.log(`  ${msg}`);
}
export function arrow(msg: string): void {
  console.log(`  ${c.dim('→')} ${msg}`);
}
export function blank(): void {
  console.log('');
}
export function rule(): void {
  console.log(RULE);
}
export function heading(msg: string): void {
  console.log(c.bold(msg));
}
export function scenarioStart(label: string): void {
  console.log(`${c.cyan('▶')} ${label}`);
}
export const colors = c;

/**
 * Padded "✓ NAME    status" line for the env / connectivity tables.
 */
export function statusLine(ok: boolean | 'warn', name: string, status: string): void {
  const mark = ok === true ? c.green('✓') : ok === 'warn' ? c.yellow('⚠') : c.red('✗');
  const padded = name.padEnd(32, ' ');
  console.log(`  ${mark} ${padded} ${status}`);
}

/**
 * AssertionError carries expected/received/hint so the runner can print the
 * spec's failure format.
 */
export class AssertionError extends Error {
  constructor(
    message: string,
    public readonly expected: unknown,
    public readonly received: unknown,
    public readonly hint?: string
  ) {
    super(message);
    this.name = 'AssertionError';
  }
}

export function assertEqual(
  label: string,
  expected: unknown,
  received: unknown,
  hint?: string
): void {
  const eq =
    expected === received ||
    (typeof expected === 'number' &&
      typeof received === 'number' &&
      Math.abs(expected - received) < 1e-9);
  if (!eq) {
    throw new AssertionError(label, expected, received, hint);
  }
}

export function assertTrue(label: string, value: unknown, hint?: string): void {
  if (!value) {
    throw new AssertionError(label, true, value, hint);
  }
}

export function assertOneOf(
  label: string,
  allowed: unknown[],
  received: unknown,
  hint?: string
): void {
  if (!allowed.includes(received)) {
    throw new AssertionError(label, `one of ${JSON.stringify(allowed)}`, received, hint);
  }
}

export function assertGte(
  label: string,
  threshold: number,
  received: unknown,
  hint?: string
): void {
  if (typeof received !== 'number' || received < threshold) {
    throw new AssertionError(label, `>= ${threshold}`, received, hint);
  }
}
