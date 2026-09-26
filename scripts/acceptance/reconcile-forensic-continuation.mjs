import fs from 'node:fs';
import path from 'node:path';

const audit = path.resolve('artifacts/merchant-clarity-implementation/2026-09-09-ui-forensics-01/P12/ui-forensics');
const indexPath = path.join(audit, 'physical/scenario-evidence-index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(path.join(audit, 'acceptance-ledger.json'), 'utf8'));
const known = new Set(ledger.scenarios.map(row => row.scenarioId));
const mapping = [];
// Reviewed against full-app-p07-auth: each named test explicitly records these
// states only after its runtime assertions; cleanup failure still fails the test.
const authStatesByTitle = {
  'signup states': ['signup-submitting', 'signup-error'],
  'login states': ['login-submitting', 'login-error'],
  'password reset request states': ['password-reset-sent-state', 'password-reset-error'],
  'reset update invalid': ['reset-update-invalid-session'],
  'reset update success': ['reset-update-success'],
  'reset update error': ['reset-update-error'],
};
for (const name of process.argv.slice(2)) {
  if (!/^[0-9TZ-]+$/.test(name)) throw new Error('Select a dated continuation directory.');
  const runRoot = path.join(audit, 'continuations', name);
  const run = JSON.parse(fs.readFileSync(path.join(runRoot, 'run.json'), 'utf8'));
  if (!run.completedAt || !run.runtimeUnchanged) throw new Error('Cannot map incomplete or unstable runs.');
  let prior = path.join(runRoot, 'before-scenarios');
  for (const spec of run.specs) {
    // Probe results are reviewed explicitly; they cannot promote shared scenario receipts.
    if (run.noSharedScenarioWrites?.includes(spec)) continue;
    const snapshot = path.join(runRoot, 'after', spec);
    const result = run.results.find(row => row.args.includes(`tests/current/${spec}.spec.ts`));
    if (!result) throw new Error(`Missing command result for ${spec}`);
    const results = JSON.parse(fs.readFileSync(path.join(runRoot, `${spec}.results.json`), 'utf8'));
    const executed = new Map();
    const walk = suite => {
      for (const item of suite.specs || []) {
        const id = item.title.split(' · ')[0];
        for (const test of item.tests || []) {
          const last = test.results?.at(-1);
          if (last?.status === 'passed') {
            const ids = spec === 'full-app-p07-auth' ? (authStatesByTitle[id] || []) : [id];
            for (const scenarioId of ids) executed.set(scenarioId, (executed.get(scenarioId) || 0) + 1);
          }
        }
      }
      for (const child of suite.suites || []) walk(child);
    };
    walk(results);
    for (const id of fs.readdirSync(snapshot)) {
      const receiptPath = path.join(snapshot, id, 'receipt.json');
      if (!known.has(id) || !fs.existsSync(receiptPath)) continue;
      const bytes = fs.readFileSync(receiptPath, 'utf8');
      const before = path.join(prior, id, 'receipt.json');
      if (fs.existsSync(before) && fs.readFileSync(before, 'utf8') === bytes && (executed.get(id) || 0) < 2) continue;
      const receipt = JSON.parse(bytes);
      if (receipt.verdict !== 'passed' || receipt.variants?.length < 2) continue;
      // A rewritten afterAll receipt is not proof that its tests passed.
      // Suites with descriptive titles need an explicit reviewed mapping.
      if ((executed.get(id) || 0) < receipt.variants.length) continue;
      const evidence = receipt.supportingEvidence || [];
      if (!evidence.length || evidence.some(file => !fs.existsSync(path.join(snapshot, file.replace(/^scenarios\//, ''))))) throw new Error(`Missing rendered evidence for ${id}`);
      const receiptRelative = path.relative(audit, receiptPath);
      const verdict = index.scenarios[id]?.verdict === 'partial' || id === 'authenticated-route-loading-shell' ? 'partial' : 'passed';
      index.scenarios[id] = {
        verdict, evidencePaths: [...new Set([...(index.scenarios[id]?.evidencePaths || []), path.relative(audit, path.join(runRoot, 'run.json')), receiptRelative])],
        note: `Executed ${spec} on build ${run.buildId}, runtime ${run.runtimeSourceFingerprint}; ${receipt.note} ${verdict === 'partial' ? 'Wider previously open contract clauses, including native accessibility/zoom where applicable, remain open.' : ''} Scope remains the receipt's declared contract. Unaffected prior-build evidence is retained with its original provenance; this is not a fresh cross-browser or visual-parity claim.`,
      };
      mapping.push({ id, spec, buildId: run.buildId, suiteExitCode: result.code, verdict, receipt: receiptRelative });
    }
    prior = snapshot;
  }
}
const now = new Date().toISOString();
const backup = path.join(audit, 'continuations', `index-before-${Date.now()}.json`);
fs.copyFileSync(indexPath, backup);
index.generatedAt = now;
index.source = 'Build-bound continuation receipts plus retained prior evidence; independent review and final-build-wide acceptance remain open.';
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
fs.writeFileSync(path.join(audit, 'continuations', `mapping-${Date.now()}.json`), JSON.stringify({ generatedAt: now, mapping }, null, 2) + '\n');
console.log(`Mapped ${mapping.length} freshly changed, rendered, passing receipts; original index preserved.`);
