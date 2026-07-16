# Unauth Chrome extension

Merchant-facing access to customer payout context and evidence preparation from
supported helpdesk and commerce pages. The extension uses the versioned Unauth
API with a merchant API key; it does not use browser session cookies.

## Build

From the repository root:

```bash
npm run build:extension
```

For a deterministic production package:

```bash
cd extensions/chrome
npm install
VITE_UNAUTH_API_BASE=https://app.unauth.co npm run build
```

The checked-in `dist/` directory is intentional: the authenticated download
route packages it for merchants. Rebuild it whenever source, manifest, or API
origin changes.

To test locally, set `VITE_UNAUTH_API_BASE=http://localhost:3000`, rebuild, and
load `extensions/chrome/dist` as an unpacked extension. Never publish a build
whose manifest grants a local or preview origin.

## Runtime contract

- The background worker owns API calls and reads the API key from
  `chrome.storage.local`.
- The content script can detect an email but never receives the API key.
- Lookup uses `GET /api/v1/lookup` for merchant-authorized customer context.
- Evidence preparation uses `POST /api/v1/evidence` with an order reference.
- The UI presents identity confidence and merchant-owned payout history. It does
  not present a fraud verdict or cross-merchant recommendation.

The `<all_urls>` content-script permission exists only to detect customer email
addresses in merchant tools. The generated manifest limits network access to the
configured Unauth API origin.
