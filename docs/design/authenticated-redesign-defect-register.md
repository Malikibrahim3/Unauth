# Authenticated redesign defect register

Updated: 2026-07-13

| ID | Severity | Surface | Finding | Resolution | Status |
|---|---|---|---|---|---|
| DEF-001 | High | Global authenticated theme | Several competing root token systems allowed late legacy rust/cream aliases to control signed-in UI. | Added an isolated authoritative authenticated scope and applied it at every authenticated layout boundary. | Fixed |
| DEF-002 | High | Charts | ECharts read CSS variables from the document root, bypassing authenticated scoping. | Token reader now targets `.ua-app` or `.ua-auth-surface` first. | Fixed |
| DEF-003 | Medium | Integrations | Provider-card grid conflicted with the required compact operational connection list. | Rebuilt as grouped, responsive connection tables while preserving catalogue data and actions. | Fixed |
| DEF-004 | Medium | Onboarding | Old copper active states and ordinary card shadows retained the previous visual language. | Replaced with pale selected surfaces, near-black actions, restrained borders, and flat cards. | Fixed |
| DEF-005 | Medium | Application form | Hardcoded cream/rust fields and feedback bypassed shared tokens. | Migrated to canonical inputs, labels, critical feedback, and geometry. | Fixed |
| DEF-006 | Medium | Shared cards | The default raised card added shadow to ordinary page content. | Ordinary `Card` raised variant is now border-defined and shadowless; overlays retain elevation. | Fixed |
| DEF-007 | Low | Header | Decorative breadcrumb dot added noise and did not communicate state. | Removed; hierarchy now comes from weight and breadcrumb structure. | Fixed |
| DEF-008 | Low | Mobile Overview | Needed confirmation that financial/status data remained reachable without page overflow. | Verified at 390×844: 390px document width, metrics stack, actions and global navigation remain available. | Fixed |
| DEF-009 | Low | Local visual QA | Cold Next.js route compilation occasionally exceeded the browser navigation timeout. | Rechecked the final loaded URL/DOM after compilation; not a production UI defect. | Closed |
| DEF-010 | High | Authenticated brand mark | The automatic wordmark variant inherited the public warm logo dot despite the new product scope. | The product shell now uses the monochrome mark and the authenticated scope explicitly neutralizes the mark variables. | Fixed |
| DEF-011 | Medium | Integrations responsive table | The grouped connection table's min-content width could be mistaken for page overflow at tablet/mobile sizes. | Added zero-min-width containment to the application flex chain and retained deliberate table-local horizontal scrolling; page body width remains pinned to the viewport. | Fixed |
| DEF-012 | Medium | Page landmarks | Several route views rendered their own `main` inside the shell's page landmark, producing nested main landmarks. | Consolidated the authenticated landmark at the shell scroll container and changed route-level wrappers to neutral `div` containers. | Fixed |
| DEF-013 | Medium | Legacy test contract | Critical tests still expected superseded report/case labels after the information architecture changed. | Updated assertions to the equivalent new semantic content while preserving workflow, data, drill-down, and interaction coverage. | Fixed |

No unresolved critical or high design defect remains in this register.
