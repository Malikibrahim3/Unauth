# Authenticated design system

This is the visual authority for signed-in product surfaces: `app/(app)/**`, onboarding, and authenticated-consumed components. Public landing surfaces remain outside this scope. Application code imports `index.css`; components consume `--ua-*` tokens and the primitives exported from `components/ui`.

## Entry point and file map

`index.css` is the only authenticated stylesheet entry point. It imports the files below in order:

| File | Responsibility |
|---|---|
| `tokens.css` | Surfaces, text, borders, action colour, radii, shadows, heights, spacing and aliases |
| `status.css` | Restrained semantic colours and status aliases |
| `typography.css` | Shared type roles |
| `foundations.css` | Canvas, focus, selection and motion defaults |
| `controls.css` | Shared input and control baseline |
| `surfaces.css` | Shell and operational surface defaults |
| `tables.css` | Table headers, rows and hover behaviour |
| `overlays.css` | Overlay token notes |
| `states.css` | Loading, empty, stale and error-state guidance |
| `responsive.css` | Global responsive control density |

## Component taxonomy

| Component | Purpose | Interactive | Shape | Height | Colour usage | Examples |
|---|---|---:|---|---|---|---|
| Button | Trigger an action | Yes | `control` | `sm`, `md`, `lg` | Primary is ink; secondary is surface; danger is critical; ghost is quiet | Save, Review, Close |
| IconButton | Trigger a compact icon action | Yes | `control` | `sm`, `md`, `lg` | Same action hierarchy as Button | Close, More actions |
| Status badge | Describe lifecycle or operational state | No | `pill` | `badge` | Neutral, info, warning, success or critical only when meaningful | Needs evidence, Closed |
| Filter chip | Change a dataset or view | Yes | `pill` | `chip` | Selected is neutral/ink, never semantic | All, Awaiting carrier |
| Segmented control | Switch between 2–5 mutually exclusive choices | Yes | Enclosed `control` | `sm` or `md` | Neutral selected surface, no semantic colours | Updated / Oldest |
| Tabs | Navigate persistent sections | Yes | Control or underline | `md` | Ink text and restrained active rule | Overview, Activity |
| Metadata chip | Show quiet secondary information | No | `control` | `sm` | Neutral only | Shopify, CSV, 3 sources |
| Input / Select | Collect or choose a value | Yes | `control` | Input / control scale | Surface, border and focus tokens | Search, page size |
| Pagination | Move through a result set | Yes | `control` | `sm` | Neutral controls and ink current action | Previous, Next |
| Card / inset panel | Group related operational content | No | `card` | Content-driven | Surface + hairline border; no ordinary shadow | Case summary, detail panel |
| Metric group | Present related KPIs as one group | No | `card` | Content-driven | Neutral cells and hairline dividers | Open cases, exposure |
| Table | Present comparable records | Sometimes | `card` shell | Shared header/row heights | Quiet metadata, aligned numbers | `DataTable` for interactive client views; `DataTableServer` for server-rendered tables |
| Drawer / modal | Contain focused work above the page | Yes | `overlay` | Content-driven | Overlay surface and overlay shadow only | Edit rule, case details |
| Alert | Communicate a meaningful condition | Sometimes | `card` | Content-driven | Restrained semantic tint | Connection warning |
| Empty / loading / error | Explain a state and give the next useful action | Sometimes | `card` or plain state | Content-driven | Neutral by default; semantic only when useful | No cases, Try again |

Recommendations, missing evidence and next steps are not chips. Use `RecommendationBlock`, `EvidenceChecklist`, a checklist row, an ordered list or an action row.

## Geometry and colour rules

The final shape scale is intentionally limited:

```css
--ua-radius-control
--ua-radius-card
--ua-radius-overlay
--ua-radius-pill
```

Shared heights are:

```css
--ua-control-height-sm
--ua-control-height-md
--ua-control-height-lg
--ua-badge-height
--ua-chip-height
```

Ink (`--ua-accent`) is the authenticated primary action colour. Blue is reserved for functional links, information, provider branding, data visualisation and focus where contrast requires it. Selected filters, tabs, rows and navigation use warm-neutral surfaces. Status colour is semantic and never the only status signal.

Ordinary cards and panels use a border and surface, without decorative shadows or gradients. Overlay shadows belong only to actual overlays. Standard buttons do not use pill geometry, text arrows or page-local recipes.

## Do not introduce

- A page-local button, badge, filter or card recipe.
- A status badge for metadata, a filter or a next action.
- A sentence rendered as a chip.
- A semantic colour for selection or ordinary navigation.
- A one-off radius, shadow or control height.
- `→` or `↗` in merchant-facing labels.

## Guardrails

Run `npm run lint:authenticated-design` after changing authenticated UI. The guard checks hardcoded colours, arbitrary radii and shadows, old palette residue, landing-token dependencies, deprecated imports, authenticated `PanelCard` usage, native-control count drift and text-arrow drift. Document a narrow exception only for a data-viz series, third-party brand mark, or explicitly listed low-level control.
