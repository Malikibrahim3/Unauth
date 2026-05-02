#!/bin/bash
# Apply migration 0023 via Supabase direct connection
PGPASSWORD='Boyo19961996!uuu' psql \
  "host=db.saeueexkqmubnveacepr.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" \
  -f "$(dirname "$0")/../supabase/migrations/0023_bulk_write_rpcs.sql" 2>&1
