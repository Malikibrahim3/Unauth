# Authenticated final defect register

Updated: 2026-07-14

| ID | Severity | Surface | Finding | Resolution/status |
|---|---|---|---|---|
| FDEF-001 | High | Server-rendered DataTable migration | Client `DataTable` received function-valued columns from server components and failed at runtime. | Fixed by adding `DataTableServer` for static server-rendered tables; interactive client tables retain `DataTable`. Rebuilt and evidence spec passed. |
| FDEF-002 | High | Panel surfaces | Authenticated routes used a separate `PanelCard` visual family. | Fixed; 0 authenticated call sites remain. Public landing primitive is retained. |
| FDEF-003 | High | Operational tables | Reports, losses, customer order history, integration capability, claims request mix, and claim-review history used hand-built tables. | Fixed for the six migrated surfaces with canonical table primitives. Eight specialized/legacy table openings remain documented. |
| FDEF-004 | Medium | Loading | Navigation skeleton wrappers and route-local loading systems remain alongside the new canonical skeleton. | Partially fixed; six route loading files use `LoadingSkeleton`; compatibility wrappers remain open for a later low-risk migration. |
| FDEF-005 | Medium | Native controls | A broad native-control audit still finds low-level controls in legacy/specialized components. | Baseline held at 235 and exact file counts are enforced by `lint:authenticated-design`; migration remains open where a shared primitive would change behavior. |
| FDEF-006 | Medium | Browser coverage | In-app browser runtime cannot initialize in this environment. | Playwright fallback passed the 26-capture final evidence spec; manual in-app inspection and the 768px target remain open. |
| FDEF-007 | Low | Public compatibility chart | Donut component remains in the repository for the public demo. | Accepted documented exception; no authenticated consumer remains and the component has no animated/emphasis treatment. |

No unresolved critical defect was found in the executed route and interaction suites. The remaining items are explicit verification/migration limitations, not silently grandfathered visual systems.
