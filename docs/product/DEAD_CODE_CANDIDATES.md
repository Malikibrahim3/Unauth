# Dead-code candidate register

The deployment branch runs `npm run verify:dead-code` as a report-only,
Next/Jest/Playwright-aware source-graph check. The 27 August 2026 report found
71 candidate paths and 1,970 reachable paths. Candidates are not deletion
instructions: the graph cannot prove the absence of dynamic imports, manifest
ownership, route ownership, runtime file reads, package-script use, test use,
or Chrome-extension use.

## Decision rule

Every candidate remains in the deployment tree until all of the following are
true:

- static and dynamic references are absent;
- route, surface-manifest, script, CI, extension, and package ownership are
  absent;
- runtime disk reads and generated-asset consumers are absent; and
- focused tests, lint, typechecks, surface checks, and the production build
  pass after the deletion.

If any of those facts cannot be proved, the path is retained and this register
is the audit trail. Compatibility redirects also remain until production access
evidence shows 90 days without use.

## Report summary

The report includes alternate customer workbench pieces, the current recovery
client, landing composition modules, chart primitives, compatibility shell
components, provider panels, domain helpers, and test/support modules. They are
intentionally retained because source-graph tooling cannot establish that they
are unused across App Router entrypoints, dynamic imports, runtime file reads,
or evidence fixtures.

The safe cleanup set is separate from this candidate list: the duplicate visual
system document, historical implementation/evidence collections, two local
scripts with no current owner, and exact regenerable tracked test artifacts were
reviewed, archived or made ephemeral, and removed only after reference checks.
Supabase migrations remain immutable history. `private/`, `artifacts/`, and
`references/` remain outside the deployment commit and are ignored rather than
broadly deleted.

## Re-run and disposition

Run `npm run verify:dead-code` from a clean install. A zero exit status means
the report completed; it does not mean the candidate list is safe to delete.
Each future deletion must be a small subsystem commit with its evidence and
focused/full verification receipt recorded in the deployment-readiness log.
