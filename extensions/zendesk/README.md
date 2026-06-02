# Unauth Zendesk sidebar app

Private Zendesk Support app that shows identity confidence and claims history on every ticket.

## Installation

1. Download `public/downloads/unauth-zendesk-app.zip` from the repo, or use **Unauth → Settings → Integrations → Zendesk** in the dashboard.
2. In Zendesk → **Admin** → **Apps and integrations** → **Zendesk Support apps** → **Upload private app**.
3. Upload the zip file (`manifest.json` and `index.html` at the root of the zip, not the parent folder name).
4. When prompted for **API key**, enter your Unauth key from **Settings → API & Integrations** in the Unauth dashboard.
5. Install the app. **Unauth Fraud Intelligence** appears in the ticket sidebar.
6. Return to Unauth and click **Verify install** on the Zendesk integration page.

The packaged app calls `https://app.unauth.co` for API requests.
