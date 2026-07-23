#!/usr/bin/env bash
#
# Regenerate lib/supabase/types.ts from the proven local Supabase schema.
#
# Why a temp file: shell redirection (`> types.ts`) truncates the target to
# empty BEFORE the generator runs. If `supabase gen types` then fails (most
# commonly an auth/login expiry), the canonical types file is left blank,
# breaking typecheck and build for everyone. We generate into a temp file and
# only move it into place once the command has succeeded AND produced
# non-empty output, so a failed run leaves the existing types.ts untouched.
#
# Usage: npm run gen:supabase-types
#
# This command is intentionally local-only. Production-derived schema changes
# first enter the canonical baseline and must pass fresh replay before types are
# regenerated; the type task never contacts a linked project.
set -euo pipefail

OUT="lib/supabase/types.ts"
TMP="lib/supabase/types.tmp.ts"

# Clean up the temp file on any exit (success, failure, or interrupt).
trap 'rm -f "$TMP"' EXIT

mkdir -p "$(dirname "$OUT")"
rm -f "$TMP"

supabase gen types typescript --local > "$TMP"

# Refuse to overwrite a real file with empty output (e.g. auth failed silently).
if [ ! -s "$TMP" ]; then
  echo "supabase gen types produced empty output; leaving $OUT untouched" >&2
  exit 1
fi

mv "$TMP" "$OUT"
echo "Wrote $OUT"
