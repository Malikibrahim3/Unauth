import { env } from '@/lib/utils/env';
import type { GorgiasWidgetModel, WidgetRiskTier } from './widgetData';
import { confidenceLabel, formatRelativeFirstSeen, tierHeadline } from './widgetData';

export type WidgetRenderContext = {
  model: GorgiasWidgetModel;
  /** encodeURIComponent — for profile links */
  emailForProfileUrl: string;
  /** JSON.stringify — safe for inline script literals */
  apiKeyJson: string;
  emailJson: string;
  orderIdJson: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tierTheme(tier: WidgetRiskTier): { bg: string; border: string; accent: string; icon: string } {
  if (tier === 'high') {
    return {
      bg: '#3d0e0a',
      border: '#e8362a',
      accent: '#fde8e6',
      icon: '🔴',
    };
  }
  if (tier === 'medium') {
    return {
      bg: '#3d2a0a',
      border: '#d4a72c',
      accent: '#fdf6e6',
      icon: '🟠',
    };
  }
  return {
    bg: '#0f2a18',
    border: '#6fcf97',
    accent: '#e6f7ed',
    icon: '✅',
  };
}

function baseStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.45;
      color: #f5f0eb;
      background: #14100e;
      padding: 12px;
      max-width: 300px;
    }
    .card {
      border-radius: 8px;
      border: 1px solid;
      padding: 12px;
    }
    .headline {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.03em;
      margin-bottom: 4px;
    }
    .meta {
      font-size: 12px;
      opacity: 0.92;
      margin-bottom: 10px;
    }
    .section {
      margin-top: 10px;
    }
    .section-title {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      opacity: 0.7;
      margin-bottom: 6px;
    }
    ul.signals {
      list-style: none;
      padding: 0;
    }
    ul.signals li {
      position: relative;
      padding-left: 12px;
      margin-bottom: 4px;
      font-size: 12px;
    }
    ul.signals li::before {
      content: '·';
      position: absolute;
      left: 0;
      opacity: 0.7;
    }
    .cross {
      font-size: 12px;
      padding: 8px;
      border-radius: 6px;
      background: rgba(0,0,0,0.2);
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 12px;
    }
    .btn {
      display: block;
      text-align: center;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      width: 100%;
    }
    .btn-primary {
      background: #c8763a;
      color: #fff;
    }
    .btn-primary:hover { background: #9e5a26; }
    .btn-ghost {
      background: transparent;
      color: #c8763a;
      border: 1px solid #3d2e28;
    }
    .btn-ghost:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .evidence-result {
      font-size: 11px;
      margin-top: 6px;
      word-break: break-all;
    }
    .evidence-result a { color: #c8763a; }
    .muted { color: #a89890; font-size: 12px; }
    .brand {
      font-size: 10px;
      color: #6b5c54;
      margin-top: 10px;
      text-align: right;
    }
  `;
}

function renderActions(
  ctx: WidgetRenderContext,
  showEvidence: boolean
): string {
  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const profileUrl = `${appBase}/customers?email=${ctx.emailForProfileUrl}`;

  const evidenceBtn = showEvidence
    ? `<button type="button" class="btn btn-ghost" id="unauth-pdf-btn">Get PDF</button>
       <div class="evidence-result" id="unauth-pdf-result" hidden></div>`
    : '';

  const evidenceScript = showEvidence
    ? `<script>
    (function () {
      var btn = document.getElementById('unauth-pdf-btn');
      if (!btn) return;
      var resultEl = document.getElementById('unauth-pdf-result');
      var orderId = ${ctx.orderIdJson};
      var apiKey = ${ctx.apiKeyJson};
      var email = ${ctx.emailJson};
      if (!orderId) {
        btn.disabled = true;
        btn.textContent = 'Get PDF (needs order ID)';
        return;
      }
      btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = 'Generating…';
        fetch('/api/gorgias/evidence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ api_key: apiKey, email: email, order_id: orderId })
        })
          .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
          .then(function (res) {
            if (!res.ok) {
              btn.disabled = false;
              btn.textContent = 'Get PDF';
              resultEl.hidden = false;
              resultEl.textContent = res.body && res.body.error ? res.body.error : 'PDF generation failed';
              return;
            }
            var ref = res.body.reference || 'Evidence';
            var url = res.body.pdf_url || '#';
            btn.hidden = true;
            resultEl.hidden = false;
            resultEl.innerHTML = '📄 <a href="' + url.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener noreferrer">' + ref.replace(/</g, '&lt;') + ' — Download PDF</a>';
          })
          .catch(function () {
            btn.disabled = false;
            btn.textContent = 'Get PDF';
            resultEl.hidden = false;
            resultEl.textContent = 'Could not reach Unauth';
          });
      });
    })();
    </script>`
    : '';

  return `
    <div class="actions">
      <a class="btn btn-primary" href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer">View Profile</a>
      ${evidenceBtn}
    </div>
    ${evidenceScript}
  `;
}

function renderError(message: string): string {
  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  const settingsUrl = `${appBase}/settings/api-integrations`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unauth</title>
  <style>${baseStyles()}</style>
</head>
<body>
  <div class="card" style="background:#2a211c;border-color:#6b5c54;color:#f5f0eb;">
    <div class="headline">⚠️ Connection error</div>
    <p class="muted" style="margin-top:8px;">${escapeHtml(message)}</p>
    <p class="muted" style="margin-top:8px;">Check your API key in Unauth → Settings → API &amp; Integrations</p>
    <div class="actions">
      <a class="btn btn-primary" href="${escapeHtml(settingsUrl)}" target="_blank" rel="noopener noreferrer">Open Unauth Settings</a>
    </div>
  </div>
  <p class="brand">Unauth</p>
</body>
</html>`;
}

export function renderGorgiasWidgetHtml(ctx: WidgetRenderContext): string {
  const { model } = ctx;

  if (model.state === 'error') {
    return renderError(model.message);
  }

  if (model.state === 'not_found') {
    const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unauth</title>
  <style>${baseStyles()}</style>
</head>
<body>
  <div class="card" style="background:#1f1814;border-color:#3d2e28;">
    <div class="headline">⚪ NO PROFILE</div>
    <p class="muted" style="margin-top:8px;">Not in Unauth network yet</p>
    <p class="muted" style="margin-top:8px;">Upload orders to build your fraud history</p>
    <div class="actions">
      <a class="btn btn-primary" href="${escapeHtml(appBase)}" target="_blank" rel="noopener noreferrer">Go to Unauth</a>
    </div>
  </div>
  <p class="brand">Unauth</p>
</body>
</html>`;
  }

  if (model.state === 'low_clear') {
    const theme = tierTheme('low');
    const p = model.merchantProfile;
    const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    const profileUrl = `${appBase}/customers?email=${ctx.emailForProfileUrl}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unauth</title>
  <style>${baseStyles()}</style>
</head>
<body>
  <div class="card" style="background:${theme.bg};border-color:${theme.border};color:${theme.accent};">
    <div class="headline">${theme.icon} LOW RISK</div>
    <p class="meta">${model.noCrossMerchant ? 'No cross-merchant flags' : 'Limited network signals'}</p>
    <div class="section">
      <p class="muted">First seen: ${escapeHtml(formatRelativeFirstSeen(p.firstSeen))}</p>
      <p class="muted">Orders: ${p.totalOrders} · Refunds: ${p.totalRefunds}</p>
    </div>
    <div class="actions">
      <a class="btn btn-primary" href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer">View Profile</a>
    </div>
  </div>
  <p class="brand">Unauth</p>
</body>
</html>`;
  }

  const theme = tierTheme(model.tier);
  const { lookup } = model;
  const signalsHtml =
    lookup.signals.length > 0
      ? `<div class="section">
          <p class="section-title">Signals</p>
          <ul class="signals">
            ${lookup.signals.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>`
      : '';

  const crossHtml = lookup.cross_merchant
    ? `<div class="section cross">
        <p class="section-title">Cross-merchant</p>
        <p>${lookup.cross_merchant.merchant_count} merchants · ${lookup.cross_merchant.claim_count} claims</p>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unauth</title>
  <style>${baseStyles()}</style>
</head>
<body>
  <div class="card" style="background:${theme.bg};border-color:${theme.border};color:${theme.accent};">
    <div class="headline">${theme.icon} ${tierHeadline(model.tier)}</div>
    <p class="meta">${escapeHtml(confidenceLabel(lookup.confidence))} · Score ${lookup.risk_score}</p>
    ${signalsHtml}
    ${crossHtml}
    ${renderActions(ctx, model.showEvidence)}
  </div>
  <p class="brand">Unauth</p>
</body>
</html>`;
}

export const GORGIAS_FRAME_HEADERS = {
  'Content-Security-Policy': 'frame-ancestors https://*.gorgias.com',
} as const;
