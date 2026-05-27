# Bug Fix & Polish Implementation Plan
Generated: 27 May 2026  
Scope: fix all issues identified in post-implementation review  
Author: Cursor review pass  
For: Composer 2.5 autonomous execution

---

## How to use this document

Work through each section in order. Each item states:
- **What to change and in which file**
- **Why** (so you understand intent and do not regress anything)
- **Exact acceptance condition** you can verify before moving on

Run `npx tsc --noEmit` after every section. Do not proceed if it emits errors.  
Do not change any scoring formula, weighting logic, or matching algorithm.  
Do not use `as any` in new code; extend or cast types properly.

---

## Section 1 — Critical runtime bug: Shopify status webhook queries

**Problem:** `app/api/shopify/status/route.ts` queries `processed_webhooks` with `.eq('merchant_id', ctx.merchantId)` three times. The `processed_webhooks` table has **no `merchant_id` column** — only `webhook_id`, `processed_at`, `status`, `attempts`, `last_error`, `topic`, `shop_domain`, `updated_at`. These queries will silently return 0 rows or a Postgres column-does-not-exist error, making webhook health always appear "Healthy / 0 failures / empty history" regardless of real state.

**Fix:** Replace all three `processed_webhooks` queries to filter by `shop_domain` (which is known from `getShopifyConnectionStatus`). Only run these queries when `connection.connected === true` because `shop_domain` is only available then.

**File:** `app/api/shopify/status/route.ts`

**Current structure (lines 16–43 roughly):**
```
const [connResult, signalResult, webhookResult, webhookHealthResult, recentWebhooksResult] = await Promise.all([
  getShopifyConnectionStatus(...),
  serviceClient.from('shopify_order_signals'...).eq('merchant_id', ctx.merchantId)...,
  serviceClient.from('processed_webhooks'...).eq('merchant_id', ctx.merchantId)...,
  serviceClient.from('processed_webhooks'...).eq('merchant_id', ctx.merchantId)...,
  serviceClient.from('processed_webhooks'...).eq('merchant_id', ctx.merchantId)...,
]);
```

**Replacement logic:**

1. Run `getShopifyConnectionStatus` and the `shopify_order_signals` query in a first `Promise.all`.
2. After getting `connection`, if `!connection.connected || !connection.shopDomain` return early with the disconnected response (same as today).
3. If connected, run the remaining queries in a second `Promise.all`, filtering `processed_webhooks` by `.eq('shop_domain', connection.shopDomain)` instead of `.eq('merchant_id', ctx.merchantId)`.

The full replacement for the function body:

```typescript
export async function GET() {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_INBOX);
  if (denied) return denied;

  const [connection, signalResult] = await Promise.all([
    getShopifyConnectionStatus(serviceClient, ctx.merchantId),
    serviceClient
      .from('shopify_order_signals' as any)
      .select('created_at_shopify')
      .eq('merchant_id', ctx.merchantId)
      .order('created_at_shopify', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!connection.connected || !connection.shopDomain) {
    return NextResponse.json({
      connected: false,
      scopes: [...SHOPIFY_SCOPES],
      dataSources: ['CSV upload', 'Shopify orders (when connected)'],
    });
  }

  const shopDomain = connection.shopDomain;

  const [countResult, webhookResult, webhookHealthResult, recentWebhooksResult] = await Promise.all([
    serviceClient
      .from('shopify_order_signals' as any)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', ctx.merchantId),
    serviceClient
      .from('processed_webhooks' as any)
      .select('created_at,topic,status')
      .eq('shop_domain', shopDomain)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from('processed_webhooks' as any)
      .select('status', { count: 'exact', head: true })
      .eq('shop_domain', shopDomain)
      .eq('status', 'failed'),
    serviceClient
      .from('processed_webhooks' as any)
      .select('created_at,topic,status')
      .eq('shop_domain', shopDomain)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const lastSignal = signalResult.data as { created_at_shopify?: string | null } | null;
  const lastWebhook = webhookResult.data as { created_at?: string; topic?: string | null; status?: string | null } | null;
  const recentWebhooks = (recentWebhooksResult.data ?? []) as Array<{
    created_at: string;
    topic: string | null;
    status: string | null;
  }>;

  return NextResponse.json({
    connected: true,
    shopDomain,
    lastOrderSyncedAt: lastSignal?.created_at_shopify ?? null,
    lastWebhookAt: lastWebhook?.created_at ?? null,
    lastWebhookTopic: lastWebhook?.topic ?? null,
    lastWebhookStatus: lastWebhook?.status ?? null,
    orderCount: countResult.count ?? 0,
    lastError: connection.lastError,
    scopes: [...SHOPIFY_SCOPES],
    dataSources: ['Shopify live sync', 'CSV historical import'],
    webhookFailures: webhookHealthResult.count ?? 0,
    recentWebhooks: recentWebhooks.map((row) => ({
      at: row.created_at,
      topic: row.topic,
      status: row.status ?? 'received',
    })),
  });
}
```

**Acceptance:** `npx tsc --noEmit` passes. The route no longer references `merchant_id` on `processed_webhooks`.

---

## Section 2 — Broken audit trail claim link

**Problem:** `AuditTrailClient.tsx` generates `claimHref = /claims?claim=${row.resource_id}`. The claims page (`app/(app)/claims/page.tsx`) reads only `status`, `sort`, `sla` from `searchParams` — not `claim`. Clicking the object link in the audit trail silently drops to the unfiltered claims list.

**Fix:** Change the link target to the customer claims review page when a `resource_id` exists. Since the audit trail row stores `resource_id = claim_id` and not `customer_profile_id`, and we cannot easily join customer from the client without an extra fetch, the safest fix is to link to `/claims?status=all` and add a tooltip clarifying the user will need to locate the claim. This is better than a silent dead link.

**File:** `components/settings/AuditTrailClient.tsx`

Find:
```typescript
const claimHref = row.resource_type === 'claim' && row.resource_id
  ? `/claims?claim=${row.resource_id}`
  : null;
```

Replace with:
```typescript
const claimHref = row.resource_type === 'claim' && row.resource_id
  ? `/claims`
  : null;
```

And update the link element to add a title:
```typescript
<Link
  href={claimHref}
  className="font-medium hover:underline"
  style={{ color: 'var(--accent)' }}
  title={`Claim ${row.resource_id?.slice(0, 8) ?? ''} — opens claims list`}
>
  {auditResourceSummary(row.resource_type, row.resource_id)}
</Link>
```

**Acceptance:** No more `?claim=` in generated hrefs.

---

## Section 3 — `SensitiveField` shows "masked" badge after revealing

**Problem:** When `revealed === true`, `PrivacyBadge value="masked"` still renders, telling the user the data is masked when they are actually seeing the full email. This is misleading on a security-critical component.

**Fix:** In `components/ui/SensitiveField.tsx`, replace the always-on `PrivacyBadge` with conditional rendering based on reveal state. When revealed, show a "revealed" badge with a warning tone instead.

**File:** `components/ui/SensitiveField.tsx`

Replace the entire return JSX:

```tsx
return (
  <div className={cn('space-y-1', className)}>
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {!revealed && <PrivacyBadge value="PII masked" />}
      {revealed && (
        <span
          className="inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none"
          style={{
            background: 'var(--risk-medium-bg)',
            borderColor: 'var(--risk-medium-line)',
            color: 'var(--risk-medium-fg)',
            letterSpacing: '0.04em',
          }}
        >
          revealed
        </span>
      )}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{display}</span>
      {canToggle && (
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
            outlineColor: 'var(--accent)',
          }}
          aria-pressed={revealed}
          aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
        >
          {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {revealed ? 'Hide' : 'Reveal'}
        </button>
      )}
    </div>
  </div>
);
```

**Acceptance:** Badge changes to "revealed" (amber tone) when data is showing. Reveal button has a visible focus ring. TS compiles.

---

## Section 4 — Replace `window.confirm` with inline confirmation for team member removal

**Problem:** `window.confirm` pops a native browser dialog with no custom styling, no reason capture, and browser-dependent wording. This breaks the premium enterprise feel. The implementation doc says destructive actions must be "guarded" — not necessarily that `window.confirm` is the guard mechanism.

**Fix:** Replace with a per-row "Are you sure?" inline mini-confirmation pattern. When the trash button is clicked, set a `confirmingId` state. The row displays a small inline confirmation bar. Clicking "Remove" confirms; clicking "Cancel" resets.

**File:** `components/settings/TeamManagementClient.tsx`

1. Add state: `const [confirmingId, setConfirmingId] = useState<string | null>(null);`

2. Remove the `window.confirm` call from `removeMember`. Make `removeMember` take `member: TeamMember` and proceed directly without the confirm guard (the inline confirmation becomes the guard):

```typescript
async function removeMember(member: TeamMember) {
  setBusyMemberId(member.id);
  setConfirmingId(null);
  setMessage(null);
  try {
    const response = await fetch(`/api/team/${member.id}`, { method: 'DELETE' });
    const body = await response.json();
    if (!response.ok) throw new Error(messageFromResponse(response, body));
    setMessage({ type: 'success', text: `${member.invited_email} was removed from the team.` });
    await loadTeam();
  } catch (error) {
    setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Remove failed.' });
  } finally {
    setBusyMemberId(null);
  }
}
```

3. In `renderMemberRow`, replace the trash `<button>` with conditional rendering:

```tsx
{confirmingId === member.id ? (
  <div className="flex items-center gap-1.5 text-xs">
    <button
      type="button"
      onClick={() => removeMember(member)}
      disabled={busyMemberId === member.id}
      className="inline-flex items-center rounded-md px-2.5 py-1.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50"
      style={{ background: 'var(--risk-critical-fg)', color: 'white', outlineColor: 'var(--risk-critical-fg)' }}
    >
      {busyMemberId === member.id ? 'Removing…' : 'Remove'}
    </button>
    <button
      type="button"
      onClick={() => setConfirmingId(null)}
      className="inline-flex items-center rounded-md border px-2.5 py-1.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)', outlineColor: 'var(--accent)' }}
    >
      Cancel
    </button>
  </div>
) : (
  <button
    type="button"
    onClick={() => setConfirmingId(member.id)}
    disabled={!canRemoveThisMember || busyMemberId === member.id}
    aria-label={`Remove ${member.invited_email}`}
    className="inline-flex h-9 w-9 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
    style={{
      border: '1px solid var(--border)',
      color: 'var(--text-muted)',
      outlineColor: 'var(--accent)',
    }}
  >
    <Trash2 className="h-4 w-4" />
  </button>
)}
```

4. Remove `window` import side-effects; the `window.confirm` call is now gone.

**Acceptance:** No `window.confirm` anywhere in the file. Clicking trash shows the inline "Remove / Cancel" bar. Clicking Cancel resets the row. Clicking Remove proceeds with the API call.

---

## Section 5 — Fix focus rings on all `focus:outline-none` controls

**Problem:** `TeamManagementClient.tsx` and `AuditTrailClient.tsx` use `focus:outline-none` on `<input>`, `<select>`, and `<button>` elements with no replacement focus style. This fails the accessibility requirement "Focus rings are visible on keyboard navigation."

**Files:** `components/settings/TeamManagementClient.tsx`, `components/settings/AuditTrailClient.tsx`

**Rule:** Replace every `focus:outline-none` with `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1` plus `style={{ outlineColor: 'var(--accent)' }}` (or inline style on the element if the class approach collides).

**In `TeamManagementClient.tsx`**, find all occurrences of `focus:outline-none`:
- The invite email `<input>`: replace `focus:outline-none` with `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1`.
- The invite role `<select>`: same replacement.
- The member role `<select>` inside `renderMemberRow`: same replacement.

Add `style={{ ..., outlineColor: 'var(--accent)' }}` to each of those elements (merge into existing style prop).

**In `AuditTrailClient.tsx`**, find:
```
className="rounded-md px-3 py-1.5 text-xs focus:outline-none"
```
Replace with:
```
className="rounded-md px-3 py-1.5 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
```
And add `outlineColor: 'var(--accent)'` to its style prop.

Also add focus ring to the expand/collapse `<button>` in the audit trail table:
```
className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--surface-overlay)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
style={{ outlineColor: 'var(--accent)' }}
```

**Acceptance:** All form controls and action buttons in these two components have a visible focus outline when navigated by keyboard. No `focus:outline-none` remains in either file.

---

## Section 6 — Remove redundant role column in team member rows

**Problem:** `renderMemberRow` has a 4-column grid `[1fr_170px_130px_auto]`. Column 3 (130px) shows `<UserCog>` + `ROLE_LABELS[member.role]` — the same role already shown in the `<select>` in column 2. This is visual noise and makes rows feel over-designed.

**File:** `components/settings/TeamManagementClient.tsx`

1. Change the grid from `md:grid-cols-[1fr_170px_130px_auto]` to `md:grid-cols-[1fr_170px_auto]`.
2. Delete the entire `<div className="inline-flex items-center gap-2 text-xs" ...>` block that renders `<UserCog>` and `ROLE_LABELS[member.role]`.
3. Remove the `UserCog` import from lucide-react since it will no longer be used.

**Acceptance:** Team member rows have 3 columns: email/status, role select, action. The `UserCog` import is gone. TS compiles cleanly.

---

## Section 7 — Evidence detail page: remove duplicate "Generated" and "Customer" fields

**Problem:** `app/(app)/chargebacks/[id]/page.tsx` now has a `SectionCard` provenance block (added in Phase C) that shows "Generated" and "Customer email." Immediately below it, a grid of `<Card>` summary cards also shows `Card label="Generated"` and `Card label="Customer"`. The same data appears twice with inconsistent formatting.

**File:** `app/(app)/chargebacks/[id]/page.tsx`

Remove the two duplicate `<Card>` elements from the summary grid:
- `<Card label="Generated" value={formatDate(pkg.generated_at)} />`
- `<Card label="Customer" value={maskedEmail} />`

The grid will shrink from 6 cards to 4: Reference, CE3.0 Signals, Cross-merchant indicator, Order in dispute.

**Acceptance:** "Generated" and "Customer" each appear exactly once on the page. The provenance `SectionCard` is the authoritative source.

---

## Section 8 — Fix `EmptyState` heading level for not-found pages

**Problem:** `EmptyState` renders `<h3>` for its title. When used in `app/not-found.tsx` and `app/(app)/not-found.tsx` as the page's primary heading, the document outline has no `<h1>`, violating the accessibility requirement "Every major route has a visible H1."

**Files:** `app/not-found.tsx`, `app/(app)/not-found.tsx`

**Option chosen:** Add a visually hidden `<h1>` above the `EmptyState` in each not-found page, then rely on the `EmptyState` for the visible presentation.

In `app/not-found.tsx`, replace the existing `EmptyState` block with:

```tsx
<>
  <h1 className="sr-only">Page not found</h1>
  <EmptyState
    title="Page not found"
    description="This route does not exist or may have moved. Use the links below to get back to your workspace."
    action={
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
          style={{ background: 'var(--accent)', color: 'var(--text-inverse)', outlineColor: 'var(--accent)' }}
        >
          Go to dashboard
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-semibold hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text)', outlineColor: 'var(--accent)' }}
        >
          Sign in
        </Link>
      </div>
    }
  />
</>
```

Apply the same pattern to `app/(app)/not-found.tsx` (title "This workspace page was not found").

**Acceptance:** Each not-found page has a visually hidden `<h1>` that matches the EmptyState title text. Automated heading-order checks pass.

---

## Section 9 — Reports export menu: fix `<details>` dropdown and add Audit trail CSV

**Problem A:** `<details>`/`<summary>` stays open permanently once clicked; it does not close on outside click. This is unprofessional for an enterprise reporting page.

**Problem B:** The export menu is missing "Audit trail CSV" (required by the implementation doc §6: "Export options: claims CSV, outcomes CSV, audit trail CSV").

**File:** `app/(app)/reports/page.tsx`

This is a server component, so the export dropdown must be a small `'use client'` component. Create `components/reports/ExportMenu.tsx`:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';

interface ExportMenuProps {
  range: string;
}

export default function ExportMenu({ range }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Export
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[220px] rounded-md border py-1 shadow-lg"
          style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
        >
          <a
            role="menuitem"
            href={`/api/reports/claims?range=${range}`}
            className="block px-3 py-2 text-xs hover:bg-[var(--surface-overlay)]"
            style={{ color: 'var(--text)' }}
            onClick={() => setOpen(false)}
          >
            Claims CSV
            <span className="ml-1 opacity-60">— status, amounts, SLA</span>
          </a>
          <a
            role="menuitem"
            href={`/api/reports/claims?range=${range}&view=outcomes`}
            className="block px-3 py-2 text-xs hover:bg-[var(--surface-overlay)]"
            style={{ color: 'var(--text)' }}
            onClick={() => setOpen(false)}
          >
            Outcomes CSV
            <span className="ml-1 opacity-60">— decisions, refunds</span>
          </a>
          <a
            role="menuitem"
            href={`/api/audit-trail?format=csv&limit=200`}
            className="block px-3 py-2 text-xs hover:bg-[var(--surface-overlay)]"
            style={{ color: 'var(--text)' }}
            onClick={() => setOpen(false)}
          >
            Audit trail CSV
            <span className="ml-1 opacity-60">— all actions, actors</span>
          </a>
        </div>
      )}
    </div>
  );
}
```

In `app/(app)/reports/page.tsx`, replace:
```tsx
<details className="relative">
  <summary className="list-none cursor-pointer">
    <Button variant="secondary" size="sm">Export</Button>
  </summary>
  <div ...>
    ...
  </div>
</details>
```
with:
```tsx
<ExportMenu range={range} />
```

And add the import at the top of the file:
```tsx
import ExportMenu from '@/components/reports/ExportMenu';
```

**Acceptance:** `<details>` element is gone from the reports page. The export dropdown closes on outside click. "Audit trail CSV" is the third menu item. TS compiles.

---

## Section 10 — Audit trail CSV export should resolve actor emails, not raw UUIDs

**Problem:** The CSV export from `/api/audit-trail?format=csv` includes `actor_user_id` as a raw UUID. The requirement says "compliance reviewer can understand every row without seeing raw IDs first." Downloading the CSV and seeing UUIDs defeats the purpose.

**Fix:** In the CSV export branch of `app/api/audit-trail/route.ts`, fetch actor info (email + role) for all distinct `actor_user_id` values found in `rows`, then substitute into the CSV.

**File:** `app/api/audit-trail/route.ts`

In the `if (format === 'csv')` block, after the `rows` array is constructed, add:

```typescript
// Resolve actor emails for the CSV
const actorIds = [...new Set(rows.map((r: any) => r.actor_user_id).filter(Boolean))] as string[];
const actorMap: Record<string, { email: string; role: string }> = {};
if (actorIds.length > 0) {
  const { data: memberRows } = await service
    .from('merchant_members' as any)
    .select('user_id, invited_email, role')
    .eq('merchant_id', ctx.merchantId)
    .in('user_id', actorIds);
  const { data: merchantRow2 } = await service
    .from('merchants')
    .select('user_id')
    .eq('id', ctx.merchantId)
    .maybeSingle();
  for (const m of (memberRows ?? []) as Array<{ user_id: string | null; invited_email: string; role: string }>) {
    if (m.user_id) actorMap[m.user_id] = { email: m.invited_email, role: m.role };
  }
  if (merchantRow2?.user_id && !actorMap[merchantRow2.user_id]) {
    // Owner email falls back to current user's email if they are the requester
    actorMap[merchantRow2.user_id] = { email: user.email ?? 'owner', role: 'owner' };
  }
}

function resolveActor(actorUserId: string | null, actorRole: string | null): string {
  if (!actorUserId) return 'system';
  const known = actorMap[actorUserId];
  if (known) return `${known.email} (${known.role})`;
  return `${actorUserId.slice(0, 8)} (${actorRole ?? 'user'})`;
}
```

Then in the CSV row mapping, replace:
```typescript
row.actor_user_id ?? 'system',
row.actor_role ?? '',
```
with:
```typescript
resolveActor(row.actor_user_id ?? null, row.actor_role ?? null),
```

And update the CSV header from `['timestamp', 'action', 'object', 'actor_user_id', 'actor_role', 'summary']` to `['timestamp', 'action', 'object', 'actor', 'summary']` (5 columns now).

**Acceptance:** CSV download has an `actor` column with `email (role)` format instead of raw UUIDs. No raw UUIDs in the exported body. TS compiles.

---

## Section 11 — Upload page: restore access guard for upload permission

**Problem:** The current `app/(app)/upload/page.tsx` removed the `UPLOAD_CSV` permission redirect. A viewer-role user who cannot upload will see the full upload form, submit a file, and get a 403 from the API — confusing and wrong.

**Fix:** Add an explicit permission check. Because this is a server component and the user check already happens, add the guard after `if (user)`:

**File:** `app/(app)/upload/page.tsx`

After the `if (user)` block closes (after `recentImports` is populated), add:

```typescript
// Redirect non-upload-permitted users to dashboard
if (user) {
  const serviceClientForGuard = createServiceClient();
  const { denied: uploadDenied } = await requirePermission(serviceClientForGuard, user.id, PERMISSIONS.UPLOAD_CSV);
  if (uploadDenied) {
    redirect('/dashboard');
  }
}
```

Wait — this would create a second `requirePermission` call with a separate service client. A cleaner approach: fold the guard into the existing `if (user)` block:

Replace the existing `if (user)` block with:

```typescript
if (user) {
  const serviceClient = createServiceClient();
  const { denied: uploadDenied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.UPLOAD_CSV);
  if (uploadDenied) {
    redirect('/dashboard');
  }

  // Only fetch recent imports when the user has VIEW_HISTORY as well (they almost always do)
  const { denied: histDenied, ctx: histCtx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_HISTORY);
  if (!histDenied) {
    const { data: recentRuns } = await serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id, filename, label, status, created_at, total_rows, flagged_count')
      .eq('merchant_id', histCtx.merchantId)
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .limit(5);

    recentImports = ((recentRuns ?? []) as RecentRunRow[]).map((run) => ({
      id: run.id,
      filename: run.filename,
      label: run.label,
      status: run.status,
      createdAt: run.created_at,
      totalRows: run.total_rows,
      flaggedCount: run.flagged_count ?? 0,
    }));
  }
}
```

Also add the `redirect` import at the top if not already present:
```typescript
import { redirect } from 'next/navigation';
```

**Acceptance:** A viewer-role user navigating to `/upload` is redirected to `/dashboard`. TS compiles.

---

## Section 12 — Reports: add period-over-period KPI deltas

**Problem:** MetricCards on the reports page show static values with no directional context. The implementation doc acceptance criterion is "A manager can use the page in a weekly ops report without manual interpretation." Deltas give operational direction.

**Approach:** Compute a comparison period equal in length to `range`, fetch claims from that prior window, compute the same metrics, then show a delta indicator on key metrics.

**File:** `app/(app)/reports/page.tsx`

1. After computing `cutoff`, also compute `priorCutoff` and `priorEnd`:

```typescript
const rangeMs = range === '7d' ? 7 : range === '90d' ? 90 : 30;
const priorCutoff = range === 'all'
  ? null
  : new Date(Date.now() - rangeMs * 2 * 86400000).toISOString();
const priorEnd = range === 'all'
  ? null
  : new Date(Date.now() - rangeMs * 86400000).toISOString();
```

2. Add a prior-period claims query to the existing `Promise.all` (or as a separate query after the current ones):

```typescript
let priorClaimsQuery = serviceClient
  .from('merchant_claims' as any)
  .select('id,status,amount_at_risk,submitted_at,created_at,updated_at')
  .eq('merchant_id', ctx.merchantId);
if (priorCutoff) priorClaimsQuery = priorClaimsQuery.gte('submitted_at', priorCutoff);
if (priorEnd)    priorClaimsQuery = priorClaimsQuery.lte('submitted_at', priorEnd);
const { data: priorClaimRows } = range === 'all' ? { data: [] } : await priorClaimsQuery;
const priorClaims = (priorClaimRows ?? []) as typeof claims;

const { data: priorOutcomeRows } = priorClaims.length > 0
  ? await serviceClient
    .from('merchant_case_outcomes' as any)
    .select('claim_id,decision,outcome,amount_refunded,decided_at,created_at,updated_at')
    .in('claim_id', priorClaims.map((c: any) => c.id))
  : { data: [] };

const priorMetrics = range === 'all'
  ? null
  : buildClaimOpsMetrics(priorClaims, priorOutcomeRows ?? []);
```

3. Create a small helper function (at the top of the file, below the imports):

```typescript
function delta(current: number, prior: number | null | undefined): string | null {
  if (prior == null || prior === 0) return null;
  const pct = Math.round(((current - prior) / prior) * 100);
  if (pct === 0) return null;
  return pct > 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
}
```

4. Update the key MetricCards to include a `hint` with the delta when available. The `MetricCard` already accepts a `hint` prop. Pass the delta as an additional hint note:

```tsx
<MetricCard
  label="Total claims"
  value={claimMetrics.totalClaims.toLocaleString()}
  density="compact"
  hint={[
    'Filed in range',
    priorMetrics ? delta(claimMetrics.totalClaims, priorMetrics.totalClaims) : null,
  ].filter(Boolean).join(' · ') || 'Filed in range'}
/>
```

Apply the same pattern to: Open claims, Resolved, Overdue, Value at risk, Resolution rate. Only the 6 most operationally relevant MetricCards need deltas — not all 10.

5. Add a footnote below the Claims operations `SectionCard`:

```tsx
{priorMetrics && (
  <p className="mt-3 t-caption" style={{ color: 'var(--ink-tertiary)' }}>
    Δ vs previous {range.replace('d', '-day')} period
  </p>
)}
```

**Acceptance:** When `range` is 7d, 30d, or 90d (not "all"), the 6 key MetricCards show a delta hint like "Filed in range · ↑ 12%". TS compiles.

---

## Section 13 — Token consistency: audit trail page uses `--ink-*` while team page uses `--text`

**Problem:** The audit trail settings page (`app/(app)/settings/audit-trail/page.tsx`) uses `--ink-primary`, `--ink-secondary`, `--ink-tertiary`. The team management page uses `--text`, `--text-muted`. Both are in the same Settings section. They map to different values, so identical text styles render visually different.

**Fix:** The canonical production token layer for the app interior is `--text` / `--text-muted` (used by the majority of components). Update `app/(app)/settings/audit-trail/page.tsx` to use `--text` / `--text-muted` / `--border-subtle` consistently, matching the settings section standard.

**File:** `app/(app)/settings/audit-trail/page.tsx`

In the JSX returned from the page component, make the following replacements (inline style props only — do not touch class names):
- `color: 'var(--ink-secondary)'` → `color: 'var(--text-muted)'`
- `color: 'var(--ink-primary)'` → `color: 'var(--text)'`
- `color: 'var(--privacy-ink)'` → keep as-is (this is a semantic privacy token, intentional)

The `AuditTrailClient` uses `--ink-*` tokens internally. Leave those alone as they are self-consistent within the client component. Only change the page wrapper.

**Acceptance:** The audit trail page header text tokens match the team and data-privacy settings pages. No `--ink-primary` or `--ink-secondary` references in the page file.

---

## Final verification

After all 13 sections are complete:

1. Run `npx tsc --noEmit` — must exit 0.
2. Check for any remaining `window.confirm` in settings components.
3. Check for any remaining `focus:outline-none` without a replacement in `TeamManagementClient.tsx` and `AuditTrailClient.tsx`.
4. Check that `processed_webhooks` is no longer queried with `.eq('merchant_id', ...)`.
5. Check that `SensitiveField` renders the amber "revealed" badge when the field is shown.
6. Check that the evidence detail page no longer has duplicate "Generated" and "Customer" cards.
7. Check that `app/(app)/not-found.tsx` and `app/not-found.tsx` each have `<h1 className="sr-only">`.
8. Check that the reports export dropdown is `ExportMenu` (client component) and not a `<details>` element.
9. Check that the audit trail CSV export resolves actor emails.
10. Check that the upload page redirects on missing `UPLOAD_CSV` permission.
