# Security Scan Triage Report

Date: 2026-05-06  
Scanner: `scripts/deployment-readiness/audit-security.mjs`  
Artifact: `reports/deployment-readiness/benchmarks/security-static-scan.json`

## Summary

| Status | Count |
|---|---:|
| Active findings | 140 |
| Suppressed findings | 138 |
| Total scanned findings | 278 |

### Active findings by class

| Check | Count | Classification |
|---|---:|---|
| `service-role` | 15 | True risk |
| `csv-export` | 77 | Mixed (true risk + false positive) |
| `broad-select` | 48 | Accepted pilot risk / backlog |
| `unsafe-html` | 0 | None active |

### Suppressed findings by class

| Check | Count | Why suppressed |
|---|---:|---|
| `service-role` | 108 | Route-level auth+permission proven or non-runtime files (tests/scripts/factory) |
| `banned-language` | 19 | Intentional banned-term dictionaries/tests/scanner patterns |
| `fixed-limit` | 10 | Scripts/tests/non-runtime examples |
| `unsafe-html` | 1 | Scanner self-match in `audit-security.mjs` pattern definition |

## Triage Detail

### 1) `service-role` (15) — True risk

Reason: any `createServiceClient()` path can bypass RLS if merchant scoping is wrong.

Action:
1. Keep unsuppressed.
2. Audit every route/component call site for merchant ownership proof (`requirePermission`, `ctx.merchantId`, job ownership helpers).
3. Prioritize write paths and customer/evidence exports.

Owner: backend/security  
Target: before external pilot expansion

### 2) `csv-export` (77) — Mixed

Reason: scanner flags generic CSV output patterns; some are protected by `escapeCsvCell`, some may still be raw.

Action:
1. Keep unsuppressed by default.
2. For each export endpoint, verify `escapeCsvCell()` wrapping for all string cells.
3. Add precise suppressions only for proven-safe file+context matches.

Owner: backend  
Target: before GA

### 3) `broad-select` (48) — Accepted pilot risk

Reason: over-fetch risk and maintainability debt, but not direct auth bypass when merchant scoping is correct.

Action:
1. Keep visible.
2. Replace `select('*')` in externally exposed routes first.
3. Defer low-risk internal/admin queries to hardening sprint.

Owner: backend  
Target: post-pilot hardening sprint

### 4) `unsafe-html` (0 active) — No current production finding

Status:
1. The only previous `unsafe-html` finding was a scanner self-match at:
   `scripts/deployment-readiness/audit-security.mjs` (regex pattern definition line).
2. That case is now precisely suppressed by file and check id.

Action:
1. Keep `unsafe-html` check enabled globally.
2. Do not add broad suppressions.
3. Any future app/lib/component `dangerouslySetInnerHTML` hits must remain active.

Owner: frontend/security

## Suppression Policy

Suppressions are allowed only when both conditions are true:
1. Specific check id match.
2. Precise file pattern match.

No check-wide suppression is allowed for:
1. `service-role`
2. `csv-export`
3. `broad-select`
4. `unsafe-html` in product code

## External Dependency Risk (separate from static scan)

`npm audit --audit-level=moderate` still fails with 2 moderate vulnerabilities
through transitive `next -> postcss`. This remains tracked in:
`reports/deployment-readiness/NPM_AUDIT_MITIGATIONS.md`.
