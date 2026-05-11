# Environment Setup (Local + GitHub + Vercel)

This app needs the same environment variable names everywhere.

## Required variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `IDENTITY_SALT`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_AMPLITUDE_API_KEY` (optional, can be blank)

## Local (your computer)

1. Keep secrets in `.env.local` only.
2. Use `.env.local.example` as the template.
3. Restart `npm run dev` after changing any env values.

## GitHub (repo)

1. Never commit `.env.local`.
2. Commit `.env.local.example` so the variable names stay documented.
3. If using GitHub Actions, add secrets in:
   Repository `Settings` -> `Secrets and variables` -> `Actions`.

## Vercel (production / preview)

1. Open your project in Vercel.
2. Go to `Settings` -> `Environment Variables`.
3. Add each required variable using the exact same name.
4. Apply to `Production`, `Preview`, and `Development` as needed.
5. Redeploy after changes.

## One clean rule

Use the same keys everywhere. Only values change by environment.

