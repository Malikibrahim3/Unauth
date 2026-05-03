# Navigation Checklist

A reference for ensuring every page in the app has clear, consistent navigation.

---

## Standards

| Pattern | Rule |
|---|---|
| **Back button** | Every detail/drilldown page must have a `← Back to [Parent]` link at the top |
| **Breadcrumbs** | Multi-level pages show a breadcrumb trail next to the back button |
| **Drawer → Full page** | Drawers that expand to full-page views must reset their state on navigate (no stale drawer on back) |
| **Row clicks** | Table rows open a side drawer — NOT direct navigation to full page |
| **Full page access** | Full page is accessed via the drawer's "Full page →" button only |

---

## Page-by-Page Status

### Top-level pages (no back button needed — in sidebar nav)
- [x] `/dashboard` — Dashboard (root)
- [x] `/upload` — New Audit
- [x] `/customers` — Customers list
- [x] `/watchlist` — Watchlist
- [x] `/history` — Upload history
- [x] `/lookup` — Lookup tool
- [x] `/inbox` — Inbox
- [x] `/settings` — Settings
- [x] `/help` — Help

---

### Detail / drilldown pages (require ← Back button)

#### Customers
- [x] `/customers/[id]` — `← Back to Customers` + breadcrumb ✅
- [x] `/customers/[id]/evidence/new` — `← Back to Profile` + Customers / Profile breadcrumb ✅

#### Audits
- [x] `/audit/[runId]` — `← Dashboard` breadcrumb with arrow ✅
- [x] `/audit/[runId]/customers` — `← Back to Audit` + Dashboard / Audit breadcrumb ✅
- [x] `/audit/[runId]/transaction/[id]` — `← Back to Audit Results` + Dashboard / Audit / Transaction breadcrumb ✅

#### Evidence / Chargebacks
- [x] `/chargebacks/[id]` — `← Back to Evidence Packages` + breadcrumb ✅

#### Help
- [x] `/help/csv-export` — `← Back to upload` ✅

---

### Drawer behaviour
- [x] **Customers table** — Row click = opens drawer. "View →" direct link REMOVED. ✅
- [x] **Watchlist table** — Row click = opens drawer (no direct link). ✅
- [x] **Customer drawer → Full page** — Clicking "Full page →" resets drawer state before navigating so back-button doesn't re-open stale drawer. ✅
- [x] **Customer drawer data** — `prevProfileId` optimization removed; data always fetches fresh when a customer is selected. ✅

---

## Outstanding / Future work

- [ ] `/audit/[runId]` transaction rows — add drawer (not just link) for quick transaction preview without leaving the page
- [ ] `/inbox` rows — consider an inline preview drawer rather than navigating to full transaction page
- [ ] `/watchlist` recent-appearances section — add link to customer profile alongside the audit run link
- [ ] Mobile: back button should also trigger browser history (currently link-based)
- [ ] Keyboard navigation: Escape key already closes drawers; ensure Tab order is correct in all drawers

---

## Consistent Back Button HTML Pattern

Use this snippet for all back buttons:

```tsx
<Link
  href="/parent-page"
  className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
  style={{ color: 'var(--text-muted)' }}
>
  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
  Back to [Parent Page]
</Link>
```
