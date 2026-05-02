# Phase 6 Test Plan

## Test 1 — Small file upload test
1. Open http://localhost:3001 in your browser
2. Log in if not already logged in
3. Navigate to the upload page
4. Upload `test-data/clean.csv` (202 rows)
5. Observe:
   - [ ] Upload state shows "Transferring file to secure storage…"
   - [ ] Processing state shows "Queued for processing…" then "Processing: X/Y rows"
   - [ ] Progress bar increments during processing
   - [ ] Page redirects to audit page on completion
6. After completion, check Supabase:
   - Run: `SELECT COUNT(*) FROM fraud_transactions;` - should show ~202 rows
   - Run: `SELECT * FROM csv_upload_queue ORDER BY created_at DESC LIMIT 1;` - status should be 'completed'
   - Check Storage bucket `merchant-csv-uploads-2` - file should be deleted

## Test 2 — Large file upload test
1. Upload `test-data/mixed.csv` (larger file)
2. Observe:
   - [ ] Processing completes within 3 minutes
   - [ ] No timeout errors in server terminal
3. Verify:
   - Run: `SELECT COUNT(*) FROM fraud_transactions;` - should match CSV row count
   - Check server logs for errors

## Test 3 — Simultaneous upload test
1. Open two browser tabs to http://localhost:3001/upload
2. Upload different CSV files in each tab at the same time
3. Verify:
   - [ ] Both jobs complete successfully
   - [ ] Run: `SELECT job_id, COUNT(*) FROM fraud_transactions GROUP BY job_id;` - should show two separate job_ids with correct row counts
   - [ ] No rows mixed between jobs

## Test 4 — Failed upload recovery test
1. In Supabase SQL Editor, manually set a queue record to failed:
   ```sql
   UPDATE csv_upload_queue SET status = 'failed' WHERE id = 'some-uuid';
   ```
2. Trigger the processor by visiting http://localhost:3001/api/process-csv-job (POST)
3. Verify:
   - [ ] Failed job is not re-processed
   - [ ] processing_jobs shows correct failed status

## Test 5 — Storage cleanup test
1. After any completed job from Test 1 or 2:
2. Check Storage bucket `merchant-csv-uploads-2` in Supabase dashboard
3. Verify:
   - [ ] Original CSV file no longer exists in the bucket
   - [ ] Only the user's folder exists (or is empty)
