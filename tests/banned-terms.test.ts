/**
 * tests/banned-terms.test.ts
 *
 * Ensures no user-facing UI files contain accusatory language that implies
 * a customer is guilty of fraud. ParcelClaim is an identity intelligence tool,
 * not a fraud accusation system.
 *
 * Backend variable names (fraud_flags, flagged_count, etc.) are excluded as
 * those are DB column names and refactoring them carries too much risk.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// ---------------------------------------------------------------------------
// Terms that must never appear in user-facing UI files
// ---------------------------------------------------------------------------
const BANNED_PATTERNS: { pattern: RegExp; description: string }[] = [
  { pattern: /\bnot a fraudster\b/i,     description: '"not a fraudster" label' },
  { pattern: /\bblock customer\b/i,       description: '"Block customer" CTA' },
  { pattern: /\bdeny claim\b/i,           description: '"Deny claim" CTA' },
  { pattern: /\bconfirmed fraud\b/i,      description: '"confirmed fraud" label' },
  { pattern: /\bfraud confirmed\b/i,      description: '"fraud confirmed" label' },
  { pattern: /\babuse confirmed\b/i,      description: '"abuse confirmed" label' },
  { pattern: /\bdefinite fraud\b/i,       description: '"definite fraud" label' },
  { pattern: /\bprobable fraud\b/i,       description: '"probable fraud" label' },
  { pattern: /\bpossible fraud\b/i,       description: '"possible fraud" label' },
  { pattern: /\bguilty\b/i,               description: '"guilty" label' },
  { pattern: /\bfraudster\b/i,            description: '"fraudster" label' },
  { pattern: /\bscammer\b/i,              description: '"scammer" label' },
  { pattern: /\bbad actor\b/i,            description: '"bad actor" label' },
  { pattern: /suspicious patterns/i,      description: '"suspicious patterns" copy' },
  { pattern: /suspicious refund/i,        description: '"suspicious refund" copy' },
  { pattern: /refund fraud audit/i,       description: '"Refund fraud audit" product name' },
  { pattern: /fraud audit tool/i,         description: '"fraud audit tool" product name' },
  { pattern: /high-risk order placed/i,   description: '"High-risk order placed" label' },
  { pattern: /review risky customers/i,   description: '"Review risky customers" CTA' },
  { pattern: /top flagged customers/i,    description: '"Top flagged customers" section title' },
  { pattern: /why this customer is flagged/i, description: '"Why this customer is flagged" section title' },
];

// ---------------------------------------------------------------------------
// UI source files to check (excludes backend routes, DB migrations, tests)
// ---------------------------------------------------------------------------
const UI_DIRS = [
  'app/(app)',
  'app/(auth)',
  'app/(public)',
  'components',
  'lib/copy',
];

// Patterns to EXCLUDE from checking (backend/infra code)
const EXCLUDE_PATTERNS = [
  // API routes contain DB column names
  /app\/api\//,
  // Migration files
  /supabase\/migrations\//,
  // The test file itself
  /banned-terms\.test\./,
  // The terms constants file (it lists banned terms as data)
  /lib\/copy\/terms\.ts/,
];

// Comment lines should be ignored
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;

// ---------------------------------------------------------------------------
// Helper: collect all .tsx/.ts files in UI dirs
// ---------------------------------------------------------------------------
function collectUIFiles(rootDir: string): string[] {
  const files: string[] = [];
  for (const dir of UI_DIRS) {
    const fullDir = path.join(rootDir, dir);
    if (!fs.existsSync(fullDir)) continue;
    const matches = glob.sync('**/*.{ts,tsx}', { cwd: fullDir, absolute: true });
    files.push(...matches);
  }
  return files.filter((f) => !EXCLUDE_PATTERNS.some((ex) => ex.test(f)));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Banned user-facing terms', () => {
  const rootDir = path.resolve(__dirname, '..');
  const files = collectUIFiles(rootDir);

  test('at least one UI file is found to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { pattern, description } of BANNED_PATTERNS) {
    test(`no UI file contains ${description}`, () => {
      const violations: string[] = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          // Skip comment lines
          if (COMMENT_LINE.test(line)) return;
          if (pattern.test(line)) {
            const rel = path.relative(rootDir, file);
            violations.push(`  ${rel}:${idx + 1}  →  ${line.trim()}`);
          }
        });
      }

      if (violations.length > 0) {
        fail(
          `Found banned term (${description}) in UI files:\n${violations.join('\n')}\n\n` +
          `Replace with neutral identity-match language. See lib/copy/terms.ts for approved copy.`
        );
      }
    });
  }
});
