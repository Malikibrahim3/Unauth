# npm audit — Accepted Mitigations and Deployment Assumptions

Date: 2026-05-06
Status: **2 vulnerabilities remain (2 moderate, 0 high)**

`npm audit --audit-level=moderate` exits 1. This is acknowledged and documented below.

## Decision

The app has been intentionally upgraded to **Next.js 16.2.4** and
`eslint-config-next`/`eslint` were updated to compatible versions.
This removed the prior high-severity advisories.

`npm audit --audit-level=moderate` still reports two moderate findings via
`postcss` as a transitive `next` dependency. There is currently no non-breaking
upgrade path that clears these advisories in this dependency graph.

## Vulnerabilities

### `postcss` < 8.5.10 — XSS (GHSA-qx2v-qp2m-jg93)

- **Severity**: Moderate
- **Path**: `next` → `postcss`
- **Current version**: `next@16.2.4`
- **Exploitability**: PostCSS is build-time only in this app. Exploit requires malicious CSS input to be processed by the build pipeline.
- **Mitigation**:
  1. CSS sources are repository-controlled only.
  2. No user-provided CSS is compiled at runtime.
  3. WAF + CSP + strict asset pipeline isolation remain enabled in deployment.

### Deployment Mitigations Applied

Until the upgrade sprint:

1. **Image Optimizer DoS (GHSA-9g9p-9gw9-jx7f)**
   - Mitigation: `next.config.js` derives the Supabase image-storage hostname from
     `NEXT_PUBLIC_SUPABASE_URL` at build time using `new URL(supabaseUrl).hostname`.
     This produces an exact project-specific hostname (e.g. `abcdefghij.supabase.co`).
     **No wildcard patterns are used.**  If `NEXT_PUBLIC_SUPABASE_URL` is absent,
     `remotePatterns` is empty and image optimisation is disabled (fail-closed).
   - Previous versions of this document stated "no wildcard patterns" while the code
     used `*.supabase.co`.  That discrepancy has been corrected.
   - Reviewed and tested on every config change. CI test asserts `*.supabase.co` is
     absent and no hostname literal contains `*`.

2. **HTTP request smuggling (GHSA-ggv3-7p47-pfv8)**
   - Mitigation: The app is deployed behind a reverse proxy (Vercel/Nginx) that
     normalises HTTP/1.1 headers. Direct HTTP/1.1 access to the Node.js server is
     blocked at the network perimeter.

3. **RSC deserialization DoS (GHSA-h25m-26qc-wcjf)**
   - Mitigation: All RSC routes that accept external input are rate-limited at the
     CDN/WAF layer. Unauthenticated RSC data surfaces are minimal.

4. **next/image disk cache growth (GHSA-3x4c-7xq6-9pq8)**
   - Mitigation: Deploy with `NEXT_SHARP_PATH` and explicit cache size limits.
     Monitor disk usage in staging. Pilot has known traffic ceiling.

5. **Server Components DoS hardening**
   - Mitigation: All authenticated routes require valid Supabase JWT before
     reaching server component rendering. Unauthenticated requests are redirected.

### Remaining dependency risk

- `npm audit --audit-level=moderate` still exits non-zero because of the transitive
  PostCSS advisory path described above.
- This is treated as **accepted pilot risk**, not a hidden pass.

## Upgrade Plan

| Version | Target sprint | Risk |
|---|---|---|
| next@16.x patch stream | Ongoing | Medium — framework churn |
| postcss advisory closure | Next available patched chain | Low — transitive/build-time |

## Acceptance

These mitigations are accepted for the pilot deployment under the following
constraints:
- The app is deployed on Vercel with WAF/CDN protections enabled.
- No direct Node.js server port is exposed to the public internet.
- The pilot has a bounded user population (internal ASOS fraud team, ~10 analysts).
- The dependency risk is tracked with mandatory re-evaluation before scale-out.

**Enterprise scale-out requires re-running `npm audit --audit-level=moderate`
and adopting a fully patched dependency chain before expanding beyond the pilot cohort.**
