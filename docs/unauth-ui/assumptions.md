# Unauth UI implementation assumptions

These assumptions apply to the binding v2.1 visual-first plan and remain replaceable at the named frontend seam.

## P00 assumptions and fallbacks

1. The repository was already substantially dirty at `c9aecf461471f5d9e7abefe12e1089374cbb0a02`. All pre-existing tracked and untracked work is protected. P00 changes are limited to this documentation, the P00 capture helper and the new Reconciliation screenshot.
2. Factual route, stack, component and test observations in `docs/unauth/implementation/p00/` remain reusable, but their v1.x phase labels, statuses, approvals and certificates have no v2.1 authority.
3. The 2026-08-03 screenshots remain valid baseline evidence for surfaces whose canonical route now wraps or redirects to the same executable implementation. They are baselines only, not acceptance evidence for P01 or later.
4. The existing rule detail and simulation workbench are the truthful current precursor to “Rules impact.” P00 records that surface without claiming that the v2.1 V08 composition is implemented; V08 remains owned by P06.
5. The application and seeded local test merchant were available, so P00 used production adapters and actual generated/request types. No DemoAdapter or synthetic financial capability was introduced.
6. The local test-auth endpoint was used only to establish a browser session for a known test merchant. The capture performed no operational mutation, decision, resolution, rule run or deployment.
7. Current screenshot values are baseline test-merchant data, not the `unauth-demo-v1` golden fixture and not a cross-phase financial parity claim. The canonical fixture remains available for the later phase that first needs it.
8. The new Reconciliation capture intentionally records the current populated operating state, including the existing summary-card and queue composition that later phases must replace. It is not visually polished during P00.
9. Historical pre-existing full-suite failures are recorded as factual baseline evidence rather than rerun or repaired. P00 uses current high-signal typecheck, lint, build and focused contract tests; P07 owns the one full regression run.
10. No product UI file was edited in P00, so automated accessibility scanning of a changed route is not applicable. The real Reconciliation route received a keyboard-focus smoke during the missing baseline capture.
