import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'reports/deployment-readiness/benchmarks');
fs.mkdirSync(outDir, { recursive: true });

const includeExt = new Set(['.ts', '.tsx', '.js', '.mjs', '.sql']);
const skip = new Set(['node_modules', '.next', '.git', 'test-results']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    if (entry.name.startsWith('.tmp')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (includeExt.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const checks = [
  { id: 'service-role', pattern: /SUPABASE_SERVICE_ROLE_KEY|createServiceClient|createAdminClient/g },
  { id: 'unsafe-html', pattern: /dangerouslySetInnerHTML|innerHTML\s*=|eval\s*\(|new Function/g },
  { id: 'csv-export', pattern: /Content-Disposition|text\/csv|download/g },
  { id: 'banned-language', pattern: /\bfraudster\b|\bguilty\b|confirmed fraud|fraud confirmed|deny claim|probable fraud|possible fraud/gi },
  { id: 'broad-select', pattern: /select\(['"`]\*['"`]/g },
  { id: 'fixed-limit', pattern: /\.limit\((1000|10000)\)/g },
];

function isServiceRoleSafelyGated(rel, content) {
  // Non-runtime files are handled by explicit suppressions below.
  if (rel.startsWith('app/api/')) {
    const hasServiceRole = /createServiceClient|createAdminClient|SUPABASE_SERVICE_ROLE_KEY/.test(content);
    const hasAuth = /auth\.getUser/.test(content);
    const hasPermission = /requirePermission/.test(content);
    return hasServiceRole && hasAuth && hasPermission;
  }
  if (rel.startsWith('app/(app)/')) {
    const hasServiceRole = /createServiceClient|createAdminClient|SUPABASE_SERVICE_ROLE_KEY/.test(content);
    const hasAuth = /auth\.getUser/.test(content);
    const hasPermission = /requirePermission/.test(content);
    return hasServiceRole && hasAuth && hasPermission;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Suppression rules — known false positives / accepted non-production findings.
// Each rule MUST specify both check id AND a precise filePattern regex.
// Never suppress by check id alone — that hides real production issues.
// ---------------------------------------------------------------------------
const suppressions = [
  // banned-language: intentional canonical definitions, NOT user-facing product copy.
  // lib/copy/terms.ts IS the banned-term dictionary; flagging it is pure noise.
  { check: 'banned-language', filePattern: /^lib[/\\]copy[/\\]terms\.ts$/, reason: 'Canonical banned-term dictionary — intentional' },
  // lib/scorer.ts FORBIDDEN_WORDS is a detector constant, not rendered output.
  { check: 'banned-language', filePattern: /^lib[/\\]scorer\.ts$/, reason: 'Forbidden-word detector constant — intentional' },
  // Test files reference banned terms as test patterns, never in rendered output.
  { check: 'banned-language', filePattern: /^tests[/\\]/, reason: 'Test file — terms are test patterns, not user-facing copy' },
  // The scanner itself lists the patterns it searches for.
  { check: 'banned-language', filePattern: /^scripts[/\\]deployment-readiness[/\\]audit-security\.mjs$/, reason: 'Scanner pattern definitions — intentional' },
  // The unsafe-html regex pattern line in this scanner is not executable UI code.
  { check: 'unsafe-html', filePattern: /^scripts[/\\]deployment-readiness[/\\]audit-security\.mjs$/, reason: 'Scanner pattern definition self-match — not product rendering code' },

  // fixed-limit: diagnostic / migration scripts and test assertion files.
  // These are never shipped as part of the production server runtime.
  { check: 'fixed-limit', filePattern: /^scripts[/\\]/, reason: 'Diagnostic/migration script — not production runtime' },
  { check: 'fixed-limit', filePattern: /^tests[/\\]/, reason: 'Test file — .limit() used in assertions or mock data, not production' },
  // lib/engine/fastContext.ts has a commented-out example only — not live code.
  { check: 'fixed-limit', filePattern: /^lib[/\\]engine[/\\]fastContext\.ts$/, reason: 'Commented-out example — not live code' },
  // service-role references in tests/scripts are static text checks, not runtime exposure.
  { check: 'service-role', filePattern: /^tests[/\\]/, reason: 'Test file — static security assertions/mocks' },
  { check: 'service-role', filePattern: /^scripts[/\\]/, reason: 'Script file — non-runtime operational tooling' },
  { check: 'service-role', filePattern: /^lib[/\\]supabase[/\\]server\.ts$/, reason: 'Supabase client factory definition, not a route data access path' },
];

const allFindings = [];
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  for (const check of checks) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      check.pattern.lastIndex = 0;
      if (check.pattern.test(line)) {
        let rule = suppressions.find((s) => s.check === check.id && s.filePattern.test(rel));
        if (!rule && check.id === 'service-role' && isServiceRoleSafelyGated(rel, text)) {
          rule = {
            check: 'service-role',
            filePattern: /^$/,
            reason: 'Route/page has auth.getUser + requirePermission gate',
          };
        }
        allFindings.push({
          check: check.id,
          file: rel,
          line: i + 1,
          text: line.trim().slice(0, 220),
          suppressed: !!rule,
          suppressionReason: rule ? rule.reason : '',
        });
      }
    }
  }
}

const findings = allFindings.filter((f) => !f.suppressed);
const suppressed = allFindings.filter((f) => f.suppressed);

const grouped = findings.reduce((acc, f) => {
  acc[f.check] = (acc[f.check] ?? 0) + 1;
  return acc;
}, {});

const suppressedGrouped = suppressed.reduce((acc, f) => {
  acc[f.check] = (acc[f.check] ?? 0) + 1;
  return acc;
}, {});

fs.writeFileSync(
  path.join(outDir, 'security-static-scan.json'),
  JSON.stringify({ grouped, findings, suppressedGrouped, suppressed }, null, 2) + '\n'
);
console.log(JSON.stringify({ grouped, totalFindings: findings.length, suppressedGrouped, totalSuppressed: suppressed.length }, null, 2));
