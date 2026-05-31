# Unauth Chrome Extension

Merchant-facing browser extension for identity confidence and claims history on any customer email — Gorgias, Zendesk, Shopify, Gmail, and the open web.

Uses the Unauth public API (`/api/v1/*`) with a merchant API key. No session cookies or in-extension login.

## Prerequisites

1. An Unauth merchant account
2. An API key from **Settings → API & Integrations** in the Unauth app
3. Node.js 18+

## Development

```bash
cd extensions/chrome
npm install
npm run build
```

Output is written to `extensions/chrome/dist/`.

### Load unpacked in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extensions/chrome/dist` folder (after building)

### Watch mode

```bash
npm run dev
```

Reload the extension in `chrome://extensions` after each rebuild.

## Production build

From the repo root:

```bash
npm run build:extension
```

Or from this directory:

```bash
npm run build
```

Zip the `dist/` folder contents (not the parent) for Chrome Web Store upload:

```bash
cd dist && zip -r ../unauth-extension.zip . && cd ..
```

## Usage

1. Click the Unauth toolbar icon
2. Paste your API key on first launch (`unauth_sk_…`)
3. Enter an email (or use one auto-detected on the page)
4. **Check customer** → risk grade, signals, cross-merchant summary
5. **View full profile** opens the Unauth web app
6. **Generate evidence PDF** calls `POST /api/v1/evidence` (requires order ID)

### Page detection

The content script scans common helpdesk and commerce selectors and shows an optional **Check with Unauth** badge when an email is found. Dismiss the badge once — the preference is saved.

## API endpoints used

| Call | Endpoint |
|------|----------|
| Lookup | `GET https://app.unauth.co/api/v1/lookup?email=…` |
| Evidence | `POST https://app.unauth.co/api/v1/evidence` |

All requests send `Authorization: Bearer {api_key}` from the background service worker (never from the content script).

## Local API testing

To point at a local Next.js instance:

1. Add `"http://localhost:3000/*"` to `host_permissions` in `manifest.json`
2. Change `API_BASE` in `shared/types.ts` to `http://localhost:3000`
3. Rebuild and reload the extension

Revert before publishing to the Chrome Web Store.

## Chrome Web Store submission

1. Run a production build and zip `dist/`
2. Create a [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole)
3. Upload the zip as a new item
4. Provide:
   - Screenshots of setup, lookup, and results screens
   - Privacy policy URL (describe API key storage in `chrome.storage.local` only on-device)
   - Justification for `host_permissions` (`app.unauth.co` for fraud API) and `<all_urls>` content script (email detection on merchant tools)

## Project structure

```
manifest.json          MV3 manifest
popup/                 React popup UI
content/content.ts     Email detection + floating badge
background/background.ts  API calls + message hub
shared/                Types and message contracts
icons/                 Generated PNG icons (npm run generate-icons)
dist/                  Build output (load this in Chrome)
```

## Security notes

- API keys are stored in `chrome.storage.local` on the user’s machine only
- Network requests run in the background service worker, not page context
- The content script never sees the API key
