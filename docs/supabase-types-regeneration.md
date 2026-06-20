# Regenerating Supabase TypeScript types

`lib/supabase/types.ts` is generated from the live Supabase schema. It is **not** hand-edited.

## Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (`npx supabase` is fine).
- Logged in: `npx supabase login`
- Project ref from the dashboard (Project Settings → General → Reference ID), or from `NEXT_PUBLIC_SUPABASE_URL` (`https://<project-ref>.supabase.co`).

## Regenerate

```bash
export SUPABASE_PROJECT_ID="<your-project-ref>"
npm run gen:supabase-types
```

`npm run gen:supabase-types` runs `scripts/gen-supabase-types.sh`, which generates
into a temp file and only moves it into place once the command succeeds **and**
produced non-empty output. This avoids the previous footgun where a direct
`> lib/supabase/types.ts` redirect truncated the canonical types file to empty
before generation ran — so an auth/login failure left everyone with a blank
types file and a broken typecheck/build. A failed run now leaves `types.ts`
untouched and exits non-zero.

Equivalent manual command (note the temp-then-move, not a direct `>` redirect):

```bash
npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > lib/supabase/types.tmp.ts \
  && test -s lib/supabase/types.tmp.ts \
  && mv lib/supabase/types.tmp.ts lib/supabase/types.ts
```

## When not to run in CI

Type generation requires Supabase CLI auth and network access to your project. If credentials are unavailable, commit no fake types — leave `lib/supabase/types.ts` as-is and track schema drift via `lib/supabase/tables.ts` (table name SSOT) until types can be regenerated locally.

## After regenerating

1. Run `npx tsc --noEmit`.
2. Fix any new type errors at call sites (prefer `TABLES.*` constants over raw strings).
