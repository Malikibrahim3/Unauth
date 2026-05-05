# Phase 0 — Discovery Audit

Generated: 2026-05-05

---

## Framework

- **Framework:** Next.js 14.2.29 (App Router)
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/postcss`) with CSS custom properties as the token layer. No CSS Modules or CSS-in-JS.
- **Component library:** Radix UI primitives (`@radix-ui/*` packages for dialog, dropdown, tabs, tooltip, toast, select, progress, etc.). No shadcn/ui CLI-generated component tree. Custom components wrap Radix directly.
- **Icon library:** `lucide-react` v0.460.0
- **Routing:** App Router (`app/` directory). No `pages/` directory.
- **Font:** DM Sans + DM Mono (Google Fonts, loaded via `next/font/google`). CSS variables: `--font-dm-sans`, `--font-dm-mono`, mapped to `--font-sans` / `--font-mono`.
- **Animation:** `tailwindcss-animate` plugin; shimmer keyframe in globals.css.
- **Charts:** `recharts` v2.13
- **PDF generation:** `@react-pdf/renderer`

---

## Pages found (route → file)

| Route | File |
|---|---|
| `/dashboard` | `app/(app)/dashboard/page.tsx` |
| `/upload` | `app/(app)/upload/page.tsx` |
| `/history` | `app/(app)/history/page.tsx` |
| `/audit/[runId]` | `app/(app)/audit/[runId]/page.tsx` |
| `/audit/[runId]/customers` | `app/(app)/audit/[runId]/customers/page.tsx` |
| `/audit/[runId]/customer/[hash]` | `app/(app)/audit/[runId]/customer/[hash]/page.tsx` ← legacy per-audit customer view |
| `/audit/[runId]/transaction/[id]` | `app/(app)/audit/[runId]/transaction/[id]/page.tsx` |
| `/customers` | `app/(app)/customers/page.tsx` |
| `/customers/[id]` | `app/(app)/customers/[id]/page.tsx` ← **EXISTS** |
| `/customers/[id]/evidence/new` | `app/(app)/customers/[id]/evidence/new/page.tsx` |
| `/chargebacks` | `app/(app)/chargebacks/page.tsx` |
| `/chargebacks/[id]` | `app/(app)/chargebacks/[id]/page.tsx` |
| `/watchlist` | `app/(app)/watchlist/page.tsx` |
| `/inbox` | `app/(app)/inbox/page.tsx` |
| `/settings` | `app/(app)/settings/page.tsx` |
| `/settings/account` | `app/(app)/settings/account/page.tsx` |
| `/settings/team` | `app/(app)/settings/team/page.tsx` |
| `/settings/audit-trail` | `app/(app)/settings/audit-trail/page.tsx` |
| `/saved` | `app/(app)/saved/page.tsx` |
| `/lookup` | `app/(app)/lookup/page.tsx` |
| `/onboarding` | `app/(app)/onboarding/page.tsx` |
| `/help` | `app/(app)/help/page.tsx` |
| `/help/how-it-works` | `app/(app)/help/how-it-works/page.tsx` |
| `/help/csv-export` | `app/(app)/help/csv-export/page.tsx` |

**Answer to Phase 0 exit criteria question:** `/customers/:id` **EXISTS** at `app/(app)/customers/[id]/page.tsx` (579 lines, server component).

---

## Customer-related components found (THE DUPLICATES PROBLEM)

| File | ~LOC | Props | Where rendered | Disposition |
|---|---|---|---|---|
| `components/customers/CustomerIntelligenceDrawer.tsx` | 486 | `profileId: string \| null`, `onClose: () => void` | `components/customers/CustomersTableClient.tsx`, `components/audit/AuditCustomersTableClient.tsx`, `components/watchlist/WatchlistTableClient.tsx` | **KEEP** → becomes the redesigned Customer Drawer (§9) |
| `components/audit/CustomerProfileCard.tsx` | 339 | `profile: CustomerProfile` | `components/audit/CustomerList.tsx` only | **MERGE-INTO-DRAWER** → once drawer redesign ships, replace with a link/row that opens the drawer |
| `app/(app)/customers/[id]/page.tsx` | 579 | route params `id`, `searchParams.audit` | Direct navigation only | **KEEP** → becomes the redesigned Full Customer Page (§10) |
| `app/(app)/audit/[runId]/customer/[hash]/page.tsx` | unknown | route params | Audit context only | **MERGE-INTO-FULL-PAGE** → redirect or link to `/customers/:id?audit=runId` |
| `components/ConfidenceGrade.tsx` | 75 | `grade: 'definite'\|'probable'\|'possible'\|'weak'`, `size`, `showDot` | 9 files (audit page, chargebacks, customers, watchlist, drawer, table clients) | **MERGE** → replace with new `ConfidenceBadge` (§6.3) using A–F grade scale; keep `riskLevelToGrade` adapter |
| `components/audit/CustomerList.tsx` | unknown | renders `CustomerProfileCard` list | `app/(app)/audit/[runId]/customers/page.tsx` | **MERGE-INTO-DRAWER** → convert rows to open drawer |

---

## Existing badge / chip / pill components

| Component | File | Usage |
|---|---|---|
| `ConfidenceGrade` | `components/ConfidenceGrade.tsx` | Inline badge for risk grade (definite/probable/possible/weak); used in 9+ files |
| Inline `riskBadgeStyle()` badge span | `components/audit/CustomerProfileCard.tsx`, `components/customers/CustomersTableClient.tsx`, etc. | Hard-coded inline `<span>` styled via `riskBadgeStyle()` helper — no shared component |
| `FilterChip` | `app/(app)/customers/page.tsx` (local inline component) | Filter removal chips on customers page; local one-off |
| Watchlist chip | `components/audit/CustomerProfileCard.tsx` inline | "Linked accounts" label chip; one-off |

**Canonical badge:** None exists today. The `ConfidenceGrade` component is the closest thing to a shared badge, but uses a different grade vocabulary (`definite/probable/possible/weak` vs `A/B/C/D/F`). A new `Badge` component (§6.2) must be created as the canonical primitive.

---

## Existing table components

| Component | File | Notes |
|---|---|---|
| `CustomersTableClient` | `components/customers/CustomersTableClient.tsx` | Client component, full customers table with sorting, drawer open |
| `AuditCustomersTableClient` | `components/audit/AuditCustomersTableClient.tsx` | Similar to above but for per-audit context |
| `AuditHistoryTableClient` | `components/audit/AuditHistoryTableClient.tsx` | Audit history table |
| `WatchlistTableClient` | `components/watchlist/WatchlistTableClient.tsx` | Watchlist table, opens drawer on row click |
| `InboxClient` | `components/inbox/InboxClient.tsx` | Inbox table/list |
| Inline HTML `<table>` | Various page files | Several pages render raw `<table>` tags inline. Need standardisation. |

**Canonical table:** No single shared `DataTable` component exists. Each table is a local implementation. A shared `DataTable` (§6.9) must be built.

---

## Existing design tokens

### Colors
The existing token set uses a warm-neutral palette (`#1C1B1A` accent, warm grays). The app's current brand is monochromatic warm-neutral. Key variables:

```
--bg-canvas:        #FAFAF9   (warm off-white)
--bg-surface:       #FFFFFF
--bg-subtle:        #F5F5F4
--bg-muted:         #EFEEEC
--border-subtle:    #ECEAE6
--border:           #E2DFDA
--border-strong:    #C4BFB6
--text:             #1C1B1A
--text-muted:       #57544F
--text-subtle:      #8A857E
--accent:           #1C1B1A   (monochrome — black)
--risk-critical:    #B42318
--risk-high:        #B54708
--risk-medium:      #854D0E
--risk-low:         #2F6F3E
--info:             #175CD3
--watchlist:        #6E3FF3
```

**Gap vs spec:** The spec (§5.2) requires a cool-tinted blue-accent palette (`--accent-500: #4F66E8`) to replace the current monochrome black accent. The existing token names partially overlap but use different values and different variable names.

**Migration strategy (see Phase 1):** Add the new spec tokens under their new names. Create aliases so existing Tailwind classes (`bg-accent`, etc.) continue to resolve. Old warm-neutral tokens are kept as-is for Phase 3 progressive replacement; only replaced during per-page light refinement passes.

### Spacing
Tailwind 4px default base. No explicit spacing CSS variables. Spacing is done via Tailwind utility classes (`p-4`, `gap-3`, etc.). The spec requires named `--space-*` CSS variables.

### Typography
- Font family: DM Sans (sans), DM Mono (mono)
- Type scale defined as CSS utility classes in `globals.css`:
  - `.text-display-xl` through `.text-overline`, `.text-mono-md`, `.text-mono-lg`
  - Sizes: 36/28/22/18/16/14/13/12/11px
- **Gap vs spec §5.5:** Spec calls for Inter (or existing Inter/Geist/IBM Plex/SF Pro). DM Sans is not in the preferred list. Per spec default: "use what's already loaded if it's Inter/Geist/IBM Plex Sans/SF Pro — otherwise add Inter." DM Sans is not in the list → **need to add Inter**. However, DM Sans is a well-designed neutral humanist sans-serif very close to the desired Amplitude-style aesthetic. Conservative choice: keep DM Sans and document as a deviation (§16).

### Radius
```
--radius-xs: 2px  → maps to --radius-1 (4px) per spec — difference
--radius-sm: 4px  → maps to --radius-1 (4px) ✓
--radius-md: 6px  → maps to --radius-2 (6px) ✓
--radius-lg: 8px  → maps to --radius-3 (8px) ✓
--radius-xl: 12px → maps to --radius-4 (12px) ✓
--radius-full: 9999px → maps to --radius-pill ✓
```

### Shadows
Five shadow levels (`--shadow-xs` through `--shadow-xl`) defined via HSL with `--shadow-color: 0 0% 0%`. Spec defines 7 specific shadow values including drawer and modal shadows. Existing variables do not include `--shadow-drawer`, `--shadow-modal`, `--shadow-focus`.

### Transitions
```
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1)
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)
--duration-fast: 100ms
--duration-base: 160ms
--duration-slow: 240ms
```
Spec requires `--ease-standard`, `--ease-emphasized`, `--duration-default: 180ms`. Partial overlap.

---

## Existing recommended-action / risk-score / confidence indicators

| Component / Location | File | Visual treatment |
|---|---|---|
| `ConfidenceGrade` | `components/ConfidenceGrade.tsx` | Coloured pill with dot; grade = definite/probable/possible/weak |
| `riskBadgeStyle()` inline spans | Multiple files via `lib/utils/riskStyles.ts` | Inline CSS, no shared component |
| `riskBarStyle()` colour bar | `components/audit/CustomerProfileCard.tsx`, drawer | 4px top-border bar |
| `scoreToGrade()` | `lib/utils/riskStyles.ts` | Utility; no UI |
| `RecommendedAction.tsx` | `components/audit/RecommendedAction.tsx` | Audit-context only; standalone component |
| Inline risk score display | `components/customers/CustomerIntelligenceDrawer.tsx` | `{profile.risk_score}/100` inline in drawer header |
| Risk level badge inline | `components/customers/CustomersTableClient.tsx` | Using `riskBadgeStyle()` inline span in table cells |

---

## Open questions

None. All sections above are filled in. Conservative interpretations applied where noted.

**Key decisions taken (conservative defaults):**
1. **Font:** DM Sans retained (not replaced with Inter). DM Sans matches the Amplitude-adjacent aesthetic adequately. Deviation documented.
2. **`/customers/:id` route:** Exists. Do not create a new one; redesign the existing one (§10).
3. **Legacy per-audit customer view** (`/audit/[runId]/customer/[hash]`): Exists. Disposition = MERGE-INTO-FULL-PAGE (redirect with `?audit=runId` param).
4. **New token names:** Will be added as additional CSS variables alongside existing ones (additive, not destructive) to avoid breaking callers during Phase 1. Aliases provided.
5. **`ConfidenceGrade` component:** Uses `definite/probable/possible/weak` vocabulary, not the A–F spec. New `ConfidenceBadge` (§6.3) uses A–F. Old `ConfidenceGrade` kept until all 9 usages are migrated (Phase 6).
