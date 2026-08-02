# Living Precision release capture

Phase 28 capture is deliberately strict. `capture.mjs` accepts release evidence
only inside the image pinned by `Dockerfile`; host runs require
`LIVING_PRECISION_ALLOW_HOST=1` and are labelled `host-evidence-only`.

Before starting the application:

1. Start the isolated local Supabase stack.
2. Run `npm run seed:marketing`.
3. Run `node scripts/start-marketing-app.mjs --build`, then start the production
   application with
   `UNAUTH_CLOCK_AS_OF=2026-07-26T12:00:00.000Z`, the local Supabase variables,
   `E2E_AUTH_SECRET`, and both fixture merchant IDs in
   `E2E_ALLOWED_MERCHANT_IDS`.
4. Start a development application against the same database and frozen clock
   on a second port. `node scripts/start-marketing-app.mjs --production
   --port=3000` and `node scripts/start-marketing-app.mjs --port=3001
   --dist-dir=.next-living-precision-dev` supply the guarded server environment
   without sharing build output. The production server proves R08/R28 return
   404; the development server supplies their visual proof.

Build the capture image from the repository root:

```bash
docker build \
  --build-arg LIVING_PRECISION_APP_COMMIT="$(git rev-parse HEAD)" \
  -f scripts/living-precision/Dockerfile \
  -t unauth-living-precision .
```

Run A with Docker `--init` and `--ipc=host`, mounting only the output directory:

```bash
docker run --rm --init --ipc=host \
  -e LIVING_PRECISION_BASE_URL=http://host.docker.internal:3000 \
  -e LIVING_PRECISION_DEVELOPMENT_BASE_URL=http://host.docker.internal:3001 \
  -e E2E_AUTH_SECRET=local-marketing-auth \
  -v "$PWD/artifacts/living-precision:/workspace/artifacts/living-precision" \
  unauth-living-precision
```

After independent reviewers complete the generated scorecard template, run B
with that file mounted read-only and append `--verify`:

```bash
docker run --rm --init --ipc=host \
  -e LIVING_PRECISION_BASE_URL=http://host.docker.internal:3000 \
  -e LIVING_PRECISION_DEVELOPMENT_BASE_URL=http://host.docker.internal:3001 \
  -e E2E_AUTH_SECRET=local-marketing-auth \
  -e LIVING_PRECISION_APPROVED_SCORECARDS=/review/approved-scorecards.json \
  -v "$PWD/artifacts/living-precision:/workspace/artifacts/living-precision" \
  -v "$PWD/approved-scorecards.json:/review/approved-scorecards.json:ro" \
  unauth-living-precision --verify
```

The second command fails on route/runtime/privacy/transient defects, a pixel
change above 0.1%, non-identical encoded slots, missing human privacy or
benchmark review, unresolved P0/P1 defects, or a §14 score below threshold.

If Run A reports that a checked landing slot differs, inspect its generated
candidate at `artifacts/living-precision/run-a/product-proof`, copy the approved
file into `public/product-proof`, commit that exact source state, rebuild both
the application and capture image, and restart Run A. Release verification
never mutates checked product artwork from inside the evidence run.
