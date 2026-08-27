/**
 * RUN-11 — merchant-safe route errors.
 *
 * Error states must say what failed and what to do next. They must not expose
 * database, JavaScript, architecture or capability vocabulary, and diagnostic
 * identifiers belong in telemetry rather than on screen — while still being
 * logged so support can correlate a report.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'app/(app)';

function errorRoutes(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) errorRoutes(path, found);
    else if (entry === 'error.tsx' || entry === 'not-found.tsx') found.push(path);
  }
  return found;
}

/** Vocabulary that must never reach a merchant-facing error state. */
const BANNED = [
  // Implementation and architecture
  'canonical', 'read model', 'merchant-scoped', 'merchant scoped', 'provenance',
  'financial invariant', 'immutable', 'idempotenc', 'schema', 'postgres', 'supabase',
  'capability id', 'release gate', 'release-gated', 'versioned flow workspace',
  'versioned rule workspace',
  // JavaScript / runtime internals
  'Error type', 'TypeError', 'stack trace', 'exception', 'undefined is not',
  // Error-class vocabulary the merchant has no use for
  'Recoverable error', 'Page error',
];

/** Route labels that no longer exist in the current navigation. */
const STALE_NAVIGATION = ['Go to dashboard', 'Open claims', 'Back to dashboard'];

describe('RUN-11 merchant-safe route errors', () => {
  const files = [
    ...errorRoutes(ROOT),
    'components/states/OperationalRouteError.tsx',
    'components/ui/LoadingState.tsx',
    'app/global-error.tsx',
    'app/not-found.tsx',
  ];

  it('finds the route error states', () => {
    expect(files.length).toBeGreaterThan(30);
  });

  /** Only user-visible copy is scanned; comments explain the rule and may quote it. */
  function visibleCopy(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  }

  it.each(files)('%s uses merchant-safe language', (file) => {
    const copy = visibleCopy(readFileSync(file, 'utf8'));
    const hits = BANNED.filter((term) => copy.toLowerCase().includes(term.toLowerCase()));
    expect(hits).toEqual([]);
  });

  it.each(files)('%s links to current navigation', (file) => {
    const copy = visibleCopy(readFileSync(file, 'utf8'));
    const hits = STALE_NAVIGATION.filter((term) => copy.includes(term));
    expect(hits).toEqual([]);
  });

  it('never renders a JavaScript error name or message', () => {
    for (const file of ['components/ui/LoadingState.tsx', 'components/states/OperationalRouteError.tsx']) {
      const copy = visibleCopy(readFileSync(file, 'utf8'));
      // `error.name` / `error.message` may appear inside a console call, never in JSX.
      const jsx = copy.replace(/console\.[a-z]+\([^;]*\);/gs, '');
      expect(jsx).not.toMatch(/\{\s*(safeErrorName|error\??\.(name|message))/);
    }
  });

  it('logs the diagnostic identifier so support can correlate a report', () => {
    const source = readFileSync('components/states/OperationalRouteError.tsx', 'utf8');
    expect(source).toMatch(/console\.error\('\[route-error\]'/);
    expect(source).toContain('digest');
    expect(readFileSync('components/ui/LoadingState.tsx', 'utf8')).toContain('OperationalRouteError');
  });

  it('keeps a retry and an exit action on every shared error surface', () => {
    const source = readFileSync('components/states/OperationalRouteError.tsx', 'utf8');
    expect(source).toContain('Try again');
    expect(source).toMatch(/onClick=\{reset\}/);
    expect(source).toMatch(/<Link/);
    expect(readFileSync('components/ui/LoadingState.tsx', 'utf8')).toContain('OperationalRouteError');
  });
});
