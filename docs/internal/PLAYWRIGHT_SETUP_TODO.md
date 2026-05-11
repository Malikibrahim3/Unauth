# Playwright Audit Setup

The Playwright audit workflow runs against staging from `.github/workflows/playwright-audit.yml`.

## Required GitHub Actions Secrets

Set these repository secrets in GitHub Actions:

- `STAGING_BASE_URL`: The staging app URL with protocol.
- `STAGING_SUPABASE_URL`: The staging Supabase project URL.
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`: The staging Supabase service role key.

The workflow maps these staging secrets into the environment variable names consumed by the app and Playwright global setup.

## What the Playwright Tests Do

The Playwright audit runs on pull requests to `main` and pushes to `main`.

**Critical and mobile tests:**
- Dashboard loads and shows meaningful content
- CSV upload flow completes end-to-end
- Audit results page is clear
- Customer profile opens with intelligence
- Mobile viewport works

## Current State

- Playwright dependencies are installed in `package.json`
- Test files exist in `tests/` directory
- The workflow installs Playwright with OS dependencies
- HTML reports are uploaded as workflow artifacts
