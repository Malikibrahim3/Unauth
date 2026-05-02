# Upload pipeline audit — why the UI is stuck at "Queued for processing…"

## Evidence

**Server logs (both successful):**
```
POST /api/process-csv-job 200 in 119831ms   ← 1st run, 2000 rows, 119.8s
POST /api/process-csv-job 200 in 29793ms    ← 2nd run, 29.8s
```

**Browser console:**
```
GET https://…/rest/v1/mer… 406 (Not Acceptable)   ← x2
```

**UI state:** stuck on "Queued for processing…" with a stalled progress bar, even though the server has finished both jobs.

---

## Root cause #1 — The polling loop dies on the first transient error  ← THIS is why the UI freezes

`@/Users/malikibrahim/Downloads/Unauth/components/upload/UploadClient.tsx:261-302`

```ts
const poll = async () => {
  try {
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error || !job || cancelled) return;   // ← BUG
    …
    setTimeout(poll, 3000);                   // ← only scheduled on success
  } catch {
    setTimeout(poll, 3000);
  }
};
```

PostgREST returns `{ data: null, error: {…}, status: 406 }` (it does **not** throw) when:
- The row isn't visible yet under RLS for one tick after insert
- A read RLS check transiently fails
- Network blips during long-running requests

Because the early `return` is inside the `try` block, **no follow-up `setTimeout` is scheduled** — the polling loop is dead permanently. The `catch` branch only runs if `.single()` throws, which it doesn't for HTTP errors.

Symptom: even after the server completes the job and sets `processing_jobs.status = 'completed'`, the client never queries again, so the redirect to `/audit/{runId}` never fires. The UI is frozen on whatever status text was set on the **last successful** poll — usually "Queued for processing…" because there's never any intermediate "processing" status (see #3).

### Fix
Always reschedule, regardless of outcome:

```ts
const poll = async () => {
  if (cancelled) return;
  try {
    const { data: job, error } = await supabase
      .from('processing_jobs')
      .select('*')
      .eq('id', runId)
      .single();

    if (!error && job) {
      // … all the existing logic for total_rows, status checks, redirect, etc.
      if (job.status === 'completed') { setState('complete'); router.push(`/audit/${runId}`); return; }
      if (job.status === 'failed')    { /* … */ return; }
    }
  } catch { /* swallow */ }

  if (!cancelled) setTimeout(poll, 3000);   // ALWAYS reschedule
};
```

Also add a hard upper bound (e.g. give up after 10 minutes) so a permanently broken job doesn't poll forever.

---

## Root cause #2 — The two `406` errors on `/rest/v1/mer…` are the merchant-lookup `.single()` returning zero rows

`@/Users/malikibrahim/Downloads/Unauth/components/upload/UploadClient.tsx` (the mount `useEffect` that loads `default_column_map`):

```ts
const { data } = await supabase
  .from('merchants')
  .select('default_column_map')
  .eq('user_id', user.id)
  .single();
```

PostgREST returns **406 Not Acceptable** when `.single()` matches 0 rows. Two possibilities, both real:

1. **Migration `0018_merchant_default_column_map.sql` has not been applied.** The column doesn't exist → query fails. The user tried `supabase db push` and got `Cannot find project ref. Have you run supabase link?` — so 0018 and 0019 are still un-applied.
2. **No row exists in `merchants` for this `user_id`.** Even after 0018 runs, if signup didn't insert a merchants row this query 406s every page mount.

These 406s are **independent** of the stuck-UI bug — but they pollute the console and break the saved-default-map feature.

### Fix
- Apply migrations 0018 and 0019 (see "How to apply migrations" below).
- Replace `.single()` with `.maybeSingle()` for this lookup so a missing row returns `{ data: null }` instead of erroring.
- Confirm the signup flow inserts a merchants row; if not, add an upsert on first upload.

---

## Root cause #3 — `processing_jobs.status` never enters a `'processing'` state

`@/Users/malikibrahim/Downloads/Unauth/app/api/process-csv-job/route.ts:10-96`

The lifecycle of `processing_jobs.status` is:
1. Client inserts with `status: 'pending'` (line 182 of `UploadClient.tsx`)
2. Server processes the file (line 95 `processCsvJob`)
3. Server calls `completeJob` → flips `status` directly to `'completed'` or `'failed'`

There is no intermediate `'processing'` write on `processing_jobs`. Only `csv_upload_queue.status` flips to `'processing'`. This is why the UI status text says "Queued for processing…" the entire time the job runs — the polling code only shows the live count when it sees `status === 'processing'`:

```ts
if (job.status === 'processing') {
  setStatusText(`Processing ${job.processed_rows.toLocaleString()} of ${job.total_rows.toLocaleString()} orders`);
} else {
  setStatusText('Queued for processing…');   // ← what the user sees the whole time
}
```

### Fix
In the API route, immediately after `updateJobTotalRows`, set `processing_jobs.status = 'processing'`. Then the existing UI will show real-time `processed_rows / total_rows` progress.

```ts
await updateJobTotalRows(serviceClient, queueItem.job_id, parseResult.rowCount);
await serviceClient
  .from('processing_jobs')
  .update({ status: 'processing' })
  .eq('id', queueItem.job_id);
// … then processCsvJob, then completeJob
```

The `worker.ts` `processCsvJob` should also `update processed_rows` periodically (every N rows) so the UI progress bar isn't 0 → 100% in one jump.

---

## Root cause #4 — The job-claim race in `/api/process-csv-job`

`@/Users/malikibrahim/Downloads/Unauth/app/api/process-csv-job/route.ts:13-20`

```ts
const { data: queueItem } = await serviceClient
  .from('csv_upload_queue')
  .select('*')
  .eq('status', 'pending')
  .order('created_at', { ascending: true })   // OLDEST first
  .limit(1)
  .single();
```

This claims the **oldest pending queue row globally**, not the one the requesting client just created. Consequences:

- If a stale/orphaned `pending` row is left in the queue from any previous failed run, every new POST processes that one first.
- The new user's actual upload sits as `pending` forever — unless a second POST is fired manually.

This explains the second `29793 ms` POST in the logs: the first POST processed an old item, the second POST then processed a different item.

### Fix
Pin the claim to the specific job. Either:
- Pass `jobId` from the client in the POST body and `WHERE job_id = $1`, or
- Pass nothing but use a Postgres `FOR UPDATE SKIP LOCKED` row-lock pattern to make claims atomic.

Minimal change: have the client send the `jobId`:

```ts
// client
await fetch('/api/process-csv-job', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jobId: job.id }),
});
```

```ts
// server
const { jobId } = await request.json();
const { data: queueItem } = await serviceClient
  .from('csv_upload_queue')
  .select('*')
  .eq('status', 'pending')
  .eq('job_id', jobId)
  .single();
```

---

## Root cause #5 — 119s for 2000 rows is the genuine processing cost (not a bug, but worth knowing)

The `[fastContext]` log line shows: `emails=614 ips=2000 addrs=598 cards=0 | hits: email=614 ip=2000 address=598 card=0 coOcc=6369`. With ~6 k cross-merchant co-occurrence hits + identity resolution + scoring + 2 k inserts into `fraud_transactions`, ~120 s is plausible.

This is fine in production once `maxDuration = 300` is honoured (Vercel/Edge), but locally `next dev` doesn't enforce a cap, so the only real-world failure is the client giving up before polling can pick up the result — exactly what fix #1 addresses.

If you want to make it faster later, the worker's per-row Supabase upserts (one round-trip per row) are the obvious bottleneck. Batching `fraud_transactions` inserts in chunks of 500 with a single `.upsert` would cut this dramatically.

---

## Implementation order

1. **Apply migrations 0018 and 0019** (see below). Without these, the `default_column_map` and soft-delete features 400 in the UI even after the polling fix.
2. **Fix the polling loop** in `UploadClient.tsx` — always reschedule. This alone unblocks the stuck-UI symptom and lets users see the redirect to `/audit/{runId}` after the server completes.
3. **Add `processing_jobs.status = 'processing'`** transition in the API route — gives users a real progress indicator instead of "Queued for processing…" for 2 minutes.
4. **Make `/api/process-csv-job` claim by `jobId`** — eliminates the queue race.
5. **Switch the merchant lookup to `.maybeSingle()`** — kills the console 406 noise.

---

## How to apply migrations 0018 and 0019

`supabase db push` failed because the local CLI isn't linked to your project. Two options:

### Option A — link the CLI once, then push
```bash
supabase login
supabase link --project-ref saeueexkqmubnveacepr
supabase db push
```

### Option B — paste the SQL directly into Supabase Studio
1. Open the project SQL editor: <https://supabase.com/dashboard/project/saeueexkqmubnveacepr/sql/new>
2. Paste the contents of `@/Users/malikibrahim/Downloads/Unauth/supabase/migrations/0018_merchant_default_column_map.sql`, run.
3. Paste the contents of `@/Users/malikibrahim/Downloads/Unauth/supabase/migrations/0019_soft_delete.sql`, run.

After both run, the 406s disappear and the soft-delete buttons work end-to-end.

---

## Why the screenshot shows what it shows

- **"Queued for processing…"** → root cause #3 (no intermediate `processing` status) + root cause #1 (polling died after the first 406, never updated again).
- **Two `406` on `/rest/v1/mer…`** → root cause #2 (`merchants .single()` returning 0 rows because migration 0018 isn't applied yet, or no merchant row exists).
- **Server `200 in 119831ms` and `200 in 29793ms`** → root cause #4 (the second POST claimed a *different* queue item).

Fix #1 alone will unfreeze the UI. Fixes #2–#5 are the rest of the cleanup.
