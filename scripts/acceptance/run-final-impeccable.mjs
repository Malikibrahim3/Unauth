import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { REMAINING_CLOSURE_ROOT, writeRemainingClosureJson } from './remaining-closure-runtime.mjs';

const detectorPath = '/Users/malikibrahim/.codex/skills/impeccable/scripts/detect.mjs';
const allowedExtensions = new Set(['.css', '.ts', '.tsx', '.js', '.jsx']);
const excludedPrefixes = ['artifacts/', 'docs/', 'scripts/', 'tests/'];

// These are the UI owners actually changed by FAR-1/FAR-4. The frozen
// baseline contains unrelated dirty owners, so only this explicit authority
// list may reach the detector recovery invocation.
const farOwnedUiTargets = [
  'components/billing/BillingSettingsClient.tsx',
  'components/public/PublicOperations.module.css',
  'components/public/PublicOperationsPages.tsx',
  'components/settings/ApiIntegrationsKeyDialogs.tsx',
  'components/settings/AuditTrailClient.tsx',
].sort();

function rootPath(...segments) {
  return path.join(process.cwd(), REMAINING_CLOSURE_ROOT, ...segments);
}

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertTarget(relativePath) {
  if (path.isAbsolute(relativePath) || excludedPrefixes.some((prefix) => relativePath.startsWith(prefix))) {
    throw new Error(`Detector target is outside the FAR-owned UI scope: ${relativePath}`);
  }
  const extension = path.extname(relativePath).toLowerCase();
  if (!allowedExtensions.has(extension)) throw new Error(`Detector target has an unsupported extension: ${relativePath}`);
  const absolutePath = path.resolve(process.cwd(), relativePath);
  if (!absolutePath.startsWith(`${process.cwd()}${path.sep}`) || !fs.statSync(absolutePath).isFile()) {
    throw new Error(`Detector target is missing or outside the workspace: ${relativePath}`);
  }
  return absolutePath;
}

function runDetector(targets) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [detectorPath, '--json', ...targets], {
      cwd: process.cwd(),
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

const receiptPath = rootPath('impeccable', 'receipt.json');
if (fs.existsSync(receiptPath)) {
  throw new Error('Final Impeccable detector receipt already exists; refusing a second detector invocation.');
}
if (!fs.existsSync(detectorPath)) throw new Error('Configured Impeccable detector is unavailable.');

const baseline = readJson(rootPath('baseline.json'), 'FAR-0 baseline');
if (baseline.fixture !== 'full-app-acceptance-remaining-2026-08-31' || !baseline.repository?.statusFingerprint) {
  throw new Error('FAR-0 baseline does not match the remaining closure fixture.');
}

const absoluteTargets = farOwnedUiTargets.map(assertTarget);
const changedTargets = farOwnedUiTargets.map((relativePath, index) => ({
  path: relativePath,
  sha256: sha256(absoluteTargets[index]),
  authority: 'FAR-1/FAR-4 UI owner',
  dirtyAtFrozenBaseline: (baseline.repository.statusLines ?? []).some((line) => line.endsWith(` ${relativePath}`)),
}));
writeRemainingClosureJson('impeccable/changed-targets.json', {
  schemaVersion: 1,
  fixture: baseline.fixture,
  baselineStatusFingerprint: baseline.repository.statusFingerprint,
  generatedAt: new Date().toISOString(),
  targets: changedTargets,
  exclusions: ['docs', 'tests', 'scripts', 'artifacts', 'generated files', 'unrelated frozen dirty paths'],
});

const result = await runDetector(absoluteTargets);
const outputPath = rootPath('impeccable', 'detector-output.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, result.stdout || '[]\n', { mode: 0o600 });
let findings = [];
try {
  findings = JSON.parse(result.stdout || '[]');
  if (!Array.isArray(findings)) findings = [];
} catch {
  findings = [];
}
const primaryFindings = findings.filter((finding) => finding?.advisory !== true);
const advisoryFindings = findings.filter((finding) => finding?.advisory === true);
writeRemainingClosureJson('impeccable/receipt.json', {
  schemaVersion: 1,
  fixture: baseline.fixture,
  generatedAt: new Date().toISOString(),
  detector: detectorPath,
  invocation: {
    executable: process.execPath,
    args: ['--json', ...absoluteTargets],
    shell: false,
    targetCount: absoluteTargets.length,
    targetAccessVerified: true,
  },
  exitCode: result.code,
  signal: result.signal,
  rawOutput: 'impeccable/detector-output.json',
  stderr: result.stderr || null,
  findings: { primary: primaryFindings.length, advisory: advisoryFindings.length },
  reviewedDisposition: primaryFindings.length === 0
    ? 'No unresolved primary detector finding; any advisory findings remain documented in raw output.'
    : 'Primary findings require a source repair or incumbent-authority disposition before closure.',
});

if (result.stderr) process.stderr.write(result.stderr);
if (result.code !== 0 || primaryFindings.length > 0) process.exitCode = 1;
