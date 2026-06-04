# Unauth Zendesk sidebar app

Private Zendesk Support app that shows identity confidence and claims history on every ticket.

## Required package layout (zip root)

Zendesk validates the upload against this structure:

```
manifest.json
translations/
  en.json
assets/
  iframe.html      ← ticket sidebar UI (HTTPS scripts only)
  logo.png         ← admin / manage apps
  logo-small.png   ← app header icon
```

Do **not** put `index.html` at the zip root — the manifest must reference `assets/iframe.html`.

## Build the downloadable zip

From the repo root:

```bash
npm run package:zendesk
```

Output: `public/downloads/unauth-zendesk-app.zip`

## Installation

1. Run `npm run package:zendesk` (or download from **Unauth → Settings → Integrations → Zendesk** after deploy).
2. In Zendesk → **Admin** → **Apps and integrations** → **Zendesk Support apps** → **Upload private app**.
3. Upload the zip. Set **Unauth app URL** (HTTPS, e.g. `https://unauth-pi.vercel.app`) and your **Unauth API key**.
4. Install to the ticket sidebar.
5. In Unauth, click **Verify install** on the Zendesk integration page.

The app calls your Unauth deployment over HTTPS (see `domainWhitelist` in `manifest.json`).
