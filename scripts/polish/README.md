# Product-polish phase manifests

Each phase of [`docs/IMPL_product_polish_and_screenshot_readiness.md`](../../docs/IMPL_product_polish_and_screenshot_readiness.md)
owns exactly one manifest in this directory, named `phase-NN.manifest.mjs`.

`npm run verify:polish -- --phase=NN` runs one manifest.
`npm run verify:polish -- --through=NN` runs phases 1..NN in order.
`npm run verify:polish -- --ledger` is the mode `release:readiness` uses: it
reconciles the specification ledger against the manifests that actually exist,
then runs `--through=<highest COMPLETE ledger phase>`.

A manifest is a default-exported object:

```js
export default {
  phase: 1,
  ownedIds: ['RUN-01', /* … */],
  report: 'docs/phase-reports/product-polish/phase-01.md',
  checks: [
    { name: 'TypeScript', command: 'npm', args: ['run', 'typecheck'] },
    { name: 'Focused suite', kind: 'jest', args: ['tests/foo.test.ts'] },
    { name: 'Artifact', kind: 'artifact', path: 'docs/evidence/foo.json' },
  ],
};
```

The runner is fail-closed. It exits non-zero when a manifest, command, fixture,
artifact, result, or owned-ID entry is absent, empty, skipped, duplicated,
stale, or non-passing, and a `kind: 'jest'` check that selects zero test files
is a failure rather than a pass. Manifests may call focused checks but must
never invoke `release:readiness`, which would recurse.
