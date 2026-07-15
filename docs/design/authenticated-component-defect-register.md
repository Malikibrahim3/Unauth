# Authenticated component defect register

Date: 2026-07-14

| ID | Scope | Defect | Priority | Next action |
|---|---|---|---:|---|
| AC-001 | Authenticated routes | Several hand-built tables remain outside `DataTable` | P1 | Migrate the documented claims, customer, imports, reports, settings and work tables without changing behaviour |
| AC-002 | Authenticated components | Legacy `PanelCard` app variants remain in active use | P1 | Move call sites to `Card`/`SectionCard`, then remove the app variants |
| AC-003 | Claims review | Some low-level claim-review forms still use `claimReviewStyles.btnStyle` and raw buttons | P1 | Replace with `Button`/`ButtonLink` while preserving form semantics |
| AC-004 | Authenticated routes | Raw buttons remain in row triggers, notification rows, menus and a few settings/forms | P1 | Classify each as primitive implementation or migrate to shared action primitives |
| AC-005 | Charts | Legacy ECharts donut consumers remain | P2 | Replace decorative composition charts with ranked tables where the dataset is small |
| AC-006 | State systems | Three loading/skeleton systems still coexist | P2 | Define a shared loading contract and migrate route skeletons |
| AC-007 | Browser verification | Seeded Playwright redesign checks passed across desktop, tablet and mobile, but a manual walkthrough of every authenticated route at every requested width remains outstanding | P0 | Extend the authenticated browser matrix with full route coverage and visual review |
| AC-008 | Copy sweep | Remaining merchant-facing copy needs a route-by-route terminology review | P1 | Run content compliance and raw enum/UUID render-path audit |

No item above is represented as a broad lint exemption. The design lint keeps its narrow baseline and the register records the remaining work.
