# CSV Upload Architecture - Setup Guide

## Manual Setup Required

Since the Supabase CLI is not linked locally, you must complete these steps manually in the Supabase dashboard before testing.

### Step 1: Create Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Create a new bucket**
3. Configure:
   - **Name**: `merchant-csv-uploads-2`
   - **Public bucket**: NO (make it private)
   - **Allowed MIME types**: `text/csv`, `application/vnd.ms-excel`, `text/plain`
   - **File size limit**: 50MB

### Step 2: Run Migration SQL

**Important**: You must run both migrations since migration 0006 was updated to add `merchant_id`.

1. Go to **SQL Editor** in Supabase dashboard
2. First, paste and run the contents of: `supabase/migrations/0006_processing_jobs.sql`
   - This adds the `merchant_id` column to `processing_jobs` and updates RLS policies
3. Then, paste and run the contents of: `supabase/migrations/0008_csv_upload_queue.sql`
   - This creates the `csv_upload_queue` table with RLS policies

The migrations create:
- `merchant_id` column in `processing_jobs` with updated RLS policies
- `csv_upload_queue` table with RLS policies
- Indexes for efficient querying
- Foreign key to `processing_jobs` table

### Step 3: Verify Setup

Run this query in SQL Editor to verify:
```sql
SELECT * FROM csv_upload_queue;
SELECT * FROM processing_jobs;
SELECT * FROM storage.buckets WHERE name = 'merchant-csv-uploads';
```

## Testing Instructions

Once setup is complete, run the dev server:
```bash
npm run dev
```

Then proceed with the 5 tests outlined in Phase 6.
