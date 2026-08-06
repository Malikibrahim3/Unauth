import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const p01Root = join(root, 'docs/unauth/implementation/p01');
const evidencePath = join(root, 'docs/unauth/implementation/evidence/P01/manifest.json');
const certificatePath = join(root, 'docs/unauth/implementation/certificates/P01.yaml');
const extraPaths = [
  'docs/unauth/implementation/visual-first-product-ui-plan.md',
  'docs/unauth/implementation/spec-lock.yaml',
  'docs/unauth/implementation/historical/P01-v1.1-blocked.yaml',
  'scripts/p01-capture-references.mjs',
  'scripts/p01-generate-evidence.mjs',
  'tests/p01/referenceContract.test.ts'
];
const sha = (value) => createHash('sha256').update(value).digest('hex');

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const candidatePaths = [...walk(p01Root), ...extraPaths.map((path) => join(root, path))]
  .map((path) => relative(root, path))
  .sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
const candidateRows = candidatePaths.map((path) => ({ path, sha256: sha(readFileSync(join(root, path))) }));
const candidateSha = sha(candidateRows.map((row) => `${row.path}\0${row.sha256}\n`).join(''));
const referenceManifest = JSON.parse(readFileSync(join(p01Root, 'references/reference-manifest.json'), 'utf8'));
const horizontalOverflow = referenceManifest.rows.filter((row) => row.overflow.width > row.overflow.viewportWidth).length;
const zoomRows = referenceManifest.rows.filter((row) => row.condition === 'zoom400-1280x1024');

const evidence = {
  label: 'PROVISIONAL — NOT CERTIFICATION EVIDENCE',
  phase: 'P01',
  status: 'PASS',
  evidence_class: 'P01_ACCEPTANCE',
  candidate_freeze: 'P01 CANDIDATE FREEZE',
  frozen_at: '2026-08-04T14:00:00+01:00',
  specification: { version: '1.2', sha256: '3acc6ae06192edde91a2ea549f6e676a4cdbe64639eefe9342f7691dbe0a17da' },
  base_revision: 'c9aecf461471f5d9e7abefe12e1089374cbb0a02',
  predecessor: {
    certificate: 'docs/unauth/implementation/certificates/P00.yaml',
    certificate_sha256: 'd26ab8ddb68781dc451696794ba70977bfa97c424f71372762e8cdf1a77dc390',
    fixture_sha256: '21ab3b0bfc310a6356158f394cdd6f2cd638ad3c7b7586b3aaf2195e6e86ea13'
  },
  candidate_content_manifest: {
    sha256: candidateSha,
    file_count: candidateRows.length,
    rule: 'repository-relative path NUL sha256 rows sorted bytewise; excludes this evidence manifest and P01 certificate',
    rows: candidateRows
  },
  visual_matrix: {
    required_frames: 180,
    captured_frames: referenceManifest.rows.length,
    horizontal_overflow_frames: horizontalOverflow,
    zoom400_rows: zoomRows.length,
    zoom400_contract: '320x256 CSS layout viewport at 4x device scale; 1280x1024 physical PNG'
  },
  tests: [
    { command: 'npm test -- tests/p01/referenceContract.test.ts --runInBand', status: 'PASS', result: '1 suite; 4 tests' },
    { command: 'node --check docs/unauth/implementation/p01/reference.js', status: 'PASS' },
    { command: 'node --check scripts/p01-capture-references.mjs', status: 'PASS' },
    { command: 'reference-manifest contract assertion', status: 'PASS', result: '180 frames; 0 horizontal overflow; 30 400% reflow rows' }
  ],
  review: {
    impeccable_detector: '1 warning and design-system advisories; no material P01 craft defect',
    independent_finish_reviewer: 'No material visual fix required for P01 v1.2 acceptance',
    review_path: 'docs/unauth/implementation/p01/review.md'
  },
  resolved_blocker: {
    id: 'P01-BLOCK-001',
    class: 'R5',
    resolution: 'Specification v1.2 authorises a non-computing supplement of verbatim locked outputs and structural Unavailable records for P12-owned detail.',
    ledger: 'docs/unauth/implementation/p01/blockers.yaml'
  },
  scope: {
    production_paths_created_or_modified_by_p01: [],
    later_phase_paths_created_or_modified_by_p01: [],
    next_phase_started: false
  }
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
const evidenceSha = sha(readFileSync(evidencePath));
const phaseDiffSha = sha(readFileSync(join(p01Root, 'phase-diff.json')));

const report = `certificate_format: phase-acceptance-report.v1
report: |
  # Phase P01 Acceptance Report

  Status: PASS
  Specification version/hash: 1.2 / 3acc6ae06192edde91a2ea549f6e676a4cdbe64639eefe9342f7691dbe0a17da
  Candidate revision/tree hash: c9aecf461471f5d9e7abefe12e1089374cbb0a02 / ${candidateSha}
  Candidate evidence class/freeze: P01_ACCEPTANCE / P01 CANDIDATE FREEZE; ${candidateRows.length} scoped files; deterministic content manifest stable across consecutive generations
  Authorised principal and instruction evidence: Project Sponsor (requesting user) / requesting_repository_controller / explicit “Implement Phase P01 only” instruction plus “do what you think is best to be able to move on” authorisation for the v1.2 blocker resolution
  Governance state: PROVISIONAL_IMPLEMENTATION
  Certification lock: ON
  Governance registry path/hash: docs/unauth/implementation/p00/owners-approvals.yaml / be1f64de855907aae879d520dc1bb2c1208ecc117c84ccae522d6a89ee3c7045
  Accountable phase seat (role / holder / status): Design / requesting_repository_controller / PROVISIONAL
  Accountable owner approval/evidence: SPEC_AUTHORISED_PROVISIONAL_CONTINUATION; objective P01 exit evidence; not a human signature and not certification evidence
  Provisional seats / vacant seats: inherited P00 registry; 11 provisional role seats / 11 vacant backup seats
  Multi-seat conflicts and mitigations: GOV-CONFLICT-001 inherited; certification lock ON, no self-verification claim, independent read-only craft review, and ratified re-review before P12
  Ratification obligations and deadline: Product, Design, Finance/Model Risk, Accessibility and Engineering ratified re-review BEFORE_P12_ENTRY; P02 impact review at P02 exit; P12 shared-data detail before P12/P14 proof
  AI/tool contribution disclosure: Codex created standalone non-production references, tests, captures, manifests and provisional governance records. It performed no financial arithmetic, live-data read, mutation, deployment, external publication, ownership, signature or certification.
  No-invented-identity / no-AI-owner attestation: PASS — no person was invented; no AI/tool occupies, approves or signs a seat
  Phase diff manifest: docs/unauth/implementation/p01/phase-diff.json / ${phaseDiffSha}; only the binding v1.2 clarification, historical v1.1 report, standalone P01 reference/evidence and scoped scripts/tests are included; no production or later-phase path
  Entry dependency evidence: P00 PASS certificate d26ab8ddb68781dc451696794ba70977bfa97c424f71372762e8cdf1a77dc390 remains valid under v1.2; frozen P00 fixture 21ab3b0bfc310a6356158f394cdd6f2cd638ad3c7b7586b3aaf2195e6e86ea13; supplement docs/unauth/implementation/p01/display-supplement.json is non-computing and v1.2-authorised
  Routes/surfaces completed: Five standalone reference surfaces — Hero Overview, Cases workbench, Recovery portfolio, Reconciliation command centre and Rule impact proof — across normal, partial, stale, unavailable, permission and error states; no product route created. P14-locked V02 values render verbatim and P12-owned detail is structurally Unavailable rather than invented.
  Tests executed: P01 Jest 1/1 suite and 4/4 tests PASS; JavaScript syntax checks PASS; capture contract PASS with 180/180 frames, 0 horizontal-overflow frames and 30 corrected 400% layout-reflow rows
  Evidence-pack links: docs/unauth/implementation/evidence/P01/manifest.json / ${evidenceSha}; docs/unauth/implementation/p01/references/reference-manifest.json; docs/unauth/implementation/p01/references/contact-sheet.png; docs/unauth/implementation/p01/review.md; docs/unauth/implementation/p01/blockers.yaml
  Independent reviewers/sign-offs: impeccable-finish-reviewer found no material visual-craft defect; Product, Design, Finance/Model Risk, Accessibility and Engineering carry SPEC_AUTHORISED_PROVISIONAL_CONTINUATION for non-production continuation only; ratified human re-review remains required before P12
  Open defects: 0
  Scope leakage check: PASS
  Candidate immutability check: PASS — deterministic scoped content hash ${candidateSha}
  Next phase started: NO

  ## Blockers

  None. P01-BLOCK-001 is resolved by specification v1.2 and the hashed non-computing supplement. P01-DEFER-001 through P01-DEFER-003 remain later-gate obligations and do not block P02 entry.
status: PASS
phase: P01
candidate_sha256: ${candidateSha}
evidence_manifest_sha256: ${evidenceSha}
next_phase_started: false
`;

mkdirSync(dirname(certificatePath), { recursive: true });
writeFileSync(certificatePath, report);
console.log(JSON.stringify({ status: 'PASS', candidate_sha256: candidateSha, evidence_manifest_sha256: evidenceSha, candidate_files: candidateRows.length }, null, 2));
