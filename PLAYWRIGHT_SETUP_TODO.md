# Playwright Audit Setup - TODO

The Playwright audit workflow is currently disabled (`.github/workflows/playwright-audit.yml.disabled`).

## To Enable Playwright Tests

### 1. Fix Deployed App
Ensure you have a working deployment at a stable URL (e.g., production Vercel app). The deployment must be fully functional with no 500 errors.

### 2. Set GitHub Actions Secret
Go to GitHub repository → Settings → Secrets and variables → Actions and add:
- `PLAYWRIGHT_BASE_URL`: Your deployed app URL with protocol (e.g., `https://your-app.vercel.app`)
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### 3. Re-enable Workflow
Rename the file:
```bash
mv .github/workflows/playwright-audit.yml.disabled .github/workflows/playwright-audit.yml
```

### 4. Commit and Push
```bash
git add .github/workflows/playwright-audit.yml
git commit -m "Re-enable Playwright audit workflow"
git push
```

## What the Playwright Tests Do

The Playwright audit provides automated daily checks on the deployed app:

**Critical path tests:**
- Dashboard loads and shows meaningful content
- CSV upload flow completes end-to-end
- Audit results page is clear
- Customer profile opens with intelligence
- Mobile viewport works

**Compliance tests:**
- Checks for banned words (e.g., "fraud")
- Ensures no technical jargon in merchant-facing text
- Verifies canonical confidence grades (Definite, Probable, Possible, Weak)

## Why It Was Disabled

The deployed app at `https://unauth-pi.vercel.app` was returning "Internal Server Error" instead of the login page, causing all Playwright tests to fail. The tests need a working deployment to run against.

## Current State

- Playwright dependencies are installed in `package.json`
- Test files exist in `tests/` directory
- AI evaluation is stubbed (Anthropic API not in use)
- Workflow is disabled until deployment is fixed
