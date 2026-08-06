# P00 UI asset and component inventory

**PROVISIONAL — NOT CERTIFICATION EVIDENCE**

## Foundations and assets

- Global styles: `app/globals.css`; authenticated tokens/layout/status/table/type contracts in `styles/authenticated`.
- Component foundations: `components/ui`, `components/authenticated`, `components/layout`, `components/nav`.
- Product operating surfaces: `components/canonical`, `components/workbench`, `components/claims`, `components/recoveries`, `components/reporting`, `components/rules`, `components/sources`.
- Icons: `lucide-react` plus repository SVG/PNG assets under `public`.
- Fonts: system/UI stacks and bundled extension fonts; no repository-wide proprietary SF asset.

## Capability inventory

| Capability | Observed implementation | P00 finding |
|---|---|---|
| Tokens/typography/spacing | `styles/authenticated/*.css`, `components/ui/tokens.ts`, `pageShellStyles.ts` | PRESENT; not yet v1.1 closed P03 tokens |
| Tables | `components/ui/DataTable.tsx`, `DataTableServer.tsx`, registry/work tables | PRESENT; multiple legacy patterns remain |
| Charts | Recharts plus `components/charts/authenticated` and route-local/canonical charts | PRESENT; v1.1 V01–V08 closed registry NOT_PRESENT |
| Forms | native/React forms across settings, sources, rules and cases | PRESENT; no single universal review/commit system proven |
| Overlays | Drawer, Modal, Toast, overlay portal, command palette, data-health drawer, preview surfaces | PRESENT |
| Focus/state | shared Drawer/Modal/Toast/Loading/Error components plus route boundaries | PRESENT; coverage varies by route |
| Visual tests | Playwright screenshot/evidence scripts and `.impeccable` render evidence | PRESENT; Storybook NOT_PRESENT |
| Accessibility | Testing Library/Jest assertions and Playwright accessibility-responsive suites | PRESENT; P12 manual AT matrix deferred |

## Reachability caveat

The observed worktree contains pre-existing untracked canonical routes and components. P00 inventories them exactly; it does not approve their semantics, redesign them, or treat them as P01/P02 evidence. `routes.json` is the deterministic filesystem reachability inventory. Overlays without independent URLs include command palette, account/workspace menu, data-health drawer, row previews/actions, bulk review/result, saved-view editor, contextual help, recovery context, export review, period-close review and merchant-decision review.
