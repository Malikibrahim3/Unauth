import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const authorityFiles = [
  '.codex/rules/authenticated-product.md',
  '.cursor/rules/authenticated-design-system.mdc',
  'CLAUDE.md',
  'styles/authenticated/README.md',
];

const requiredAuthority = 'IMPL_apple_quality_authenticated_dashboard.md';
const requiredScope = 'app/(app)/**';
const failures = [];

for (const file of authorityFiles) {
  const source = await readFile(file, 'utf8');
  if (!source.includes(requiredAuthority)) {
    failures.push(`${file} does not route .ua-app to ${requiredAuthority}`);
  }
  if (!source.includes(requiredScope)) {
    failures.push(`${file} does not name the canonical app/(app) scope`);
  }
}

const implementation = await readFile(
  'docs/IMPL_apple_quality_authenticated_dashboard.md',
  'utf8',
);
for (const marker of [
  '## 2. Product truth that is frozen',
  '## 4. Apple principles translated to the web',
  '## 15. Implementation phases',
  '## 20. Definition of Done',
]) {
  if (!implementation.includes(marker)) {
    failures.push(`Apple-quality implementation contract is missing ${marker}`);
  }
}

const predecessor = await readFile(
  'docs/IMPL_living_precision_product_ui.md',
  'utf8',
);
if (!predecessor.includes('superseded for')) {
  failures.push('Living Precision does not declare its scoped .ua-app supersession');
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

const designCheck = spawnSync(
  process.execPath,
  ['scripts/check-authenticated-design.mjs'],
  { stdio: 'inherit' },
);
if (designCheck.status !== 0) {
  process.exit(designCheck.status ?? 1);
}

console.log(
  `PASS Apple-quality authority and authenticated design contract (${authorityFiles.length} loaders)`,
);
