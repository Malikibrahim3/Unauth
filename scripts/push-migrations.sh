#!/bin/bash
# Apply migration 0023 using supabase CLI
export DB_URL="postgresql://postgres.saeueexkqmubnveacepr:Boyo19961996\!uuu@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
cd "$(dirname "$0")/.."
supabase db push --db-url "$DB_URL" 2>&1
