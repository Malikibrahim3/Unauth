#!/usr/bin/env bash
#
# Regenerate lib/supabase/types.ts from the linked Supabase project.
#
# Why a temp file: shell redirection (`> types.ts`) truncates the target to
# empty BEFORE the generator runs. If `supabase gen types` then fails (most
# commonly an auth/login expiry), the canonical types file is left blank,
# breaking typecheck and build for everyone. We generate into a temp file and
# only move it into place once the command has succeeded AND produced
# non-empty output, so a failed run leaves the existing types.ts untouched.
#
# Usage: SUPABASE_PROJECT_ID=<id> npm run gen:supabase-types
# See docs/supabase-types-regeneration.md for context.
set -euo pipefail

OUT="lib/supabase/types.ts"
TMP="lib/supabase/types.tmp.ts"

if [ -z "${SUPABASE_PROJECT_ID:-}" ]; then
  echo "Set SUPABASE_PROJECT_ID (see docs/supabase-types-regeneration.md)" >&2
  exit 1
fi

# Clean up the temp file on any exit (success, failure, or interrupt).
trap 'rm -f "$TMP"' EXIT

mkdir -p "$(dirname "$OUT")"
rm -f "$TMP"

npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > "$TMP"

# Refuse to overwrite a real file with empty output (e.g. auth failed silently).
if [ ! -s "$TMP" ]; then
  echo "supabase gen types produced empty output; leaving $OUT untouched" >&2
  exit 1
fi

mv "$TMP" "$OUT"
echo "Wrote $OUT"
