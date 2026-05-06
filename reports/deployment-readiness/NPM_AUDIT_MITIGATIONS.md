# npm audit — Accepted Mitigations and Deployment Assumptions

Date: 2026-05-06
Status: **5 vulnerabilities remain (1 moderate, 4 high)**

`npm audit --audit-level=moderate` exits 1. This is acknowledged and documented below.

## Decision

Upgrading Next.js to ≥15 or ≥16 is a **breaking change** that requires:
- App Router API surface changes
- Possible React 19 peer-dependency conflicts
- Full regression testing of all server components and API routes

This upgrade is deferred to a dedicated sprint. The vulnerabilities are mitigated
at the deployment infrastructure level until the upgrade is complete.

## Vulnerabilities

### 1. `glob` < 10.4.5 — CLI Command Injection (GHSA-5j98-mcp5-4vw2)

- **Severity**: High
- **Path**: `@next/eslint-plugin-next` → `glob`
- **Exploitability**: Only exploitable via CLI argument injection in `eslint-config-next`.
  The `glob` package is a **devDependency** used only in local lint runs and CI.
  It is **not bundled into the production app or included in the server runtime**.
- **Mitigation**: Not exploitable at runtime. Only developers with local ESLint access
  can trigger this path. Fix: upgrade `eslint-config-next` to ≥16 (breaking change).
- **Production risk**: None — devDependency only.

### 2–5. `next` 9.3.4-canary.0 – 16.3.0-canary.5 — Multiple advisories

| Advisory | Description |
|---|---|
| GHSA-9g9p-9gw9-jx7f | DoS via Image Optimizer remotePatterns config |
| GHSA-h25m-26qc-wcjf | HTTP request deserialization DoS with insecure RSC |
| GHSA-ggv3-7p47-pfv8 | HTTP request smuggling in rewrites |
| GHSA-3x4c-7xq6-9pq8 | Unbounded next/image disk cache growth |
| GHSA-q4gf-8mx6-v5v3 | Denial of Service with Server Components |

- **Fix path**: `npm audit fix --force` → installs next@16.2.4 (breaking change)
- **Current version**: next@14.2.35

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

5. **Server Components DoS (GHSA-q4gf-8mx6-v5v3)**
   - Mitigation: All authenticated routes require valid Supabase JWT before
     reaching server component rendering. Unauthenticated requests are redirected.

### PostCSS < 8.5.10 — XSS (GHSA-qx2v-qp2m-jg93)

- **Severity**: Moderate
- **Exploitability**: PostCSS is a **build-time** dependency. The XSS via unescaped
  `</style>` affects PostCSS output when processing malicious CSS input.
- **Mitigation**: All CSS source files in this project are author-controlled.
  No user-supplied CSS is ever processed through PostCSS.
- **Production risk**: None for the deployment as described.

## Upgrade Plan

| Version | Target sprint | Risk |
|---|---|---|
| next@15 LTS | Sprint Q3-2026 | Medium — App Router API changes |
| eslint-config-next@16 | Sprint Q3-2026 | Low — devDependency only |
| postcss@8.5.10+ | Sprint Q2-2026 | Low — peer-dep of next, will be resolved by next upgrade |

## Acceptance

These mitigations are accepted for the ASOS pilot deployment under the following
constraints:
- The app is deployed on Vercel with WAF/CDN protections enabled.
- No direct Node.js server port is exposed to the public internet.
- The pilot has a bounded user population (internal ASOS fraud team, ~10 analysts).
- The upgrade sprint is tracked as a mandatory pre-scale deliverable.

**Enterprise scale-out requires completing the upgrade sprint before expanding
beyond the pilot cohort.**
