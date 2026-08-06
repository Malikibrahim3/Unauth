# P00 risk and decision register

**PROVISIONAL — NOT CERTIFICATION EVIDENCE**

| ID | Risk/decision | Class | Control / exact resume boundary | Accountable seat | Status |
|---|---|---|---|---|---|
| P00-R01 | Pre-existing dirty worktree could be mistaken for P00 work | R1 | Hash `OBSERVED_BASE`; phase diff lists only P00 paths | Engineering | CONTROLLED |
| P00-R02 | Legacy financial meanings conflict with v1.1 model | R5 | Inventory only; P02 must adopt/correct before production consumption | Finance/Model Risk | DEFERRED_TO_P02 |
| P00-R03 | One provisional human principal holds all implementation seats | R4 | Conflicts disclosed; certification lock ON; no self-verification | Release | MUST_RESOLVE_BEFORE_P12_ENTRY |
| P00-R04 | Backups and independent certification reviewers are vacant | R4 | P00-P11 only; ratify distinct humans before P12 | Release | MUST_RESOLVE_BEFORE_P12_ENTRY |
| P00-R05 | Local M2 lab is not the fixed certification lab | R4 | Development-only timings; provision separate READY_CERTIFICATION lab | Platform/SRE | MUST_RESOLVE_BEFORE_P12_ENTRY |
| P00-R06 | Secret-manager implementation authority is absent | R5 | No new credential persistence; ratify before P10 secret boundary | Security/Privacy | DEFERRED |
| P00-R07 | Route sources include pre-existing untracked redesign work | R1 | Inventory as observed, do not approve or modify; preserve owner changes | Engineering | CONTROLLED |
| P00-R08 | No repository deployment command | R3 | Record NOT_PRESENT; Vercel delivery remains external/locked | Release | CONTROLLED |
| P00-R09 | Browser matrix unavailable locally | R4 | Do not claim certification; resolve in P12 lab/environment | QA | DEFERRED_TO_P12 |
| P00-R10 | P00 minimal slice could become product behavior | R5 | Keep under `lib/p00` and `tests/p00`; no app route/import | Engineering | CONTROLLED |

Capacity decision: one serial implementation stream, schedule `UNCOMMITTED`, certification staffing pending before P12.

External decision consolidation: no external decision is required to pass P00 or safely enter P01/P02. The three genuine external obligations are registry ratification, fixed-lab provisioning and production secret-manager ratification. They are consolidated in `blockers.yaml`, remain locked to their exact later boundaries and must not be interpreted as open P00 defects.
